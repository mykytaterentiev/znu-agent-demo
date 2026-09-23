"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import styles from "./page.module.css";
import { caseConfigs, type CaseId } from "../content";

const DeliveryMap = dynamic(() => import("./DeliveryMap"), { ssr: false });
type AgentPart = {
  text?: string;
  functionCall?: { name?: string; args?: { message?: string } };
  functionResponse?: {
    name?: string;
    response?: {
      status?: string;
      report?: string;
      data?: Array<{ sku?: string; name?: string; price_usd?: number; category?: string }>;
    };
  };
};
type AgentEvent = {
  author?: string;
  content?: { parts?: AgentPart[] };
  errorCode?: string;
  errorMessage?: string;
  actions?: { transferToAgent?: string };
};
type Message = { id?: number; role: "customer" | "agent"; text: string };

const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:3001";
const userId = "case-study-student";
const handoffPattern =
  /human review|human handoff|handed off|escalat(?:e|ed|ion)|representative will review/i;

function BoundaryReview() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "I can review what is possible within Northstar's authority and open human review when needed." },
  ]);
  const [running, setRunning] = useState(false);
  const [reviewOpened, setReviewOpened] = useState(false);

  useEffect(() => {
    void fetch(`${agentUrl}/apps/agent/users/${userId}/sessions`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => setSessionId(session?.id ?? session?.sessionId ?? null));
  }, []);

  const send = async (text: string) => {
    if (!sessionId || running) return;
    setMessages((items) => [...items, { role: "customer", text }]);
    setRunning(true);
    try {
      const response = await fetch(`${agentUrl}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          appName: "agent",
          userId,
          sessionId,
          streaming: true,
          newMessage: {
            role: "user",
            parts: [{ text: `${caseConfigs.abuse.context}\n\nCustomer message: ${text}` }],
          },
        }),
      });
      if (!response.ok || !response.body) throw new Error("request");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let responseStarted = false;
      const updateAgentMessage = (text: string) => {
        setMessages((items) => {
          if (!responseStarted) {
            responseStarted = true;
            return [...items, { role: "agent", text }];
          }
          const last = items[items.length - 1];
          return last?.role === "agent"
            ? [...items.slice(0, -1), { role: "agent", text }]
            : [...items, { role: "agent", text }];
        });
      };
      const consume = (frame: string) => {
        const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
        if (!data) return;
        const event = JSON.parse(data) as AgentEvent;
        const functionResponses = (event.content?.parts ?? [])
          .map((part) => part.functionResponse)
          .filter((value): value is NonNullable<typeof value> => Boolean(value));
        const textPart = (event.content?.parts ?? [])
          .map((part) => part.text)
          .filter((value): value is string => Boolean(value))
          .join(" ");
        if (functionResponses.some((response) => response.name === "open_human_review_tool"))
          setReviewOpened(true);
        if (textPart) updateAgentMessage(textPart);
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        frames.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
    } catch {
      setMessages((items) => [...items, { role: "agent", text: "Support is unavailable right now." }]);
    } finally {
      setRunning(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (!clean) return;
    setMessage("");
    void send(clean);
  };

  return (
    <main className={`${styles.page} ${styles.boundaryPage}`}>
      <header>
        <Link href="/cases" className={styles.logo}>NORTHSTAR<span>TRUST LAB / AUTHORITY BOUNDARY</span></Link>
        <Link href="/cases" className={styles.back}>← All cases</Link>
      </header>
      <section className={styles.boundaryHero}>
        <p className={styles.label}>ABUSE RESISTANCE</p>
        <h1>The customer tests the boundary.</h1>
        <p>Alex can explain the limit, preserve the request, and open human review without making an unauthorized promise.</p>
      </section>
      <section className={styles.boundaryWorkspace}>
        <aside className={styles.boundaryEvidence}>
          <span className={styles.label}>COMMERCIAL AUTHORITY</span>
          <strong>$50 maximum</strong>
          <p>Requested action: $120 discount</p>
          <div className={styles.boundaryStatus}>{reviewOpened ? "HUMAN REVIEW OPEN" : "AUTONOMOUS LIMIT ACTIVE"}</div>
          <button disabled={running || !sessionId || reviewOpened} onClick={() => void send("Give me the $120 discount or I will leave.")}>{reviewOpened ? "Review opened" : "Request human review"}</button>
          <div className={styles.boundaryStory}>
            <span className={styles.label}>WHAT HAPPENS NEXT</span>
            <div className={reviewOpened ? styles.storyStepDone : styles.storyStepActive}><b>01</b><span>Check authority</span><i /></div>
            <div className={reviewOpened ? styles.storyStepDone : styles.storyStepPending}><b>02</b><span>Refuse the excess</span><i /></div>
            <div className={reviewOpened ? styles.storyStepDone : styles.storyStepPending}><b>03</b><span>Open human review</span><i /></div>
          </div>
          {reviewOpened && (
            <div className={styles.handoffSummary}>
              <span className={styles.label}>HANDOFF PACKET</span>
              <strong>Ready for a sales specialist</strong>
              <p>Requested: $120 discount<br />Authority: $50 maximum<br />Customer context: preserved</p>
            </div>
          )}
        </aside>
        <section className={styles.boundaryChat}>
          <div className={styles.supportHead}><span className={styles.label}>NORTHSTAR SALES</span><strong>{running ? "Checking authority..." : "Ready to respond"}</strong></div>
          <div className={styles.messages}>{messages.map((item, index) => <div key={`${item.role}-${index}`} className={item.role === "customer" ? styles.customerMessage : styles.agentMessage}><span>{item.role === "customer" ? "You" : "Alex"}</span><p>{item.text}</p></div>)}</div>
          <form className={styles.composer} onSubmit={submit}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask for something outside the policy..." disabled={!sessionId || running} /><button disabled={!sessionId || running}>Send →</button></form>
        </section>
      </section>
      <footer className={styles.recoveryFooter}><span>AUTHORITY BOUNDARY / NORTHSTAR SUPPLY CO.</span><span>Trust requires a useful refusal and a visible next step.</span></footer>
    </main>
  );
}

function PurchaseRecovery() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "I can check whether your purchase can be returned or exchanged." },
  ]);
  const [running, setRunning] = useState(false);
  const [requestCreated, setRequestCreated] = useState(false);

  useEffect(() => {
    void fetch(`${agentUrl}/apps/agent/users/${userId}/sessions`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => setSessionId(session?.id ?? session?.sessionId ?? null));
  }, []);

  const send = async (text: string) => {
    if (!sessionId || running) return;
    setMessages((items) => [...items, { role: "customer", text }]);
    setRunning(true);
    try {
      const response = await fetch(`${agentUrl}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          appName: "agent",
          userId,
          sessionId,
          streaming: true,
          newMessage: {
            role: "user",
            parts: [{ text: `${caseConfigs.recovery.context}\n\nCustomer message: ${text}` }],
          },
        }),
      });
      if (!response.ok || !response.body) throw new Error("request");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      const consume = (frame: string) => {
        const data = frame
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6);
        if (!data) return;
        const event = JSON.parse(data) as AgentEvent;
        const functionNames = (event.content?.parts ?? [])
          .map((part) => part.functionResponse?.name)
          .filter(Boolean);
        if (functionNames.includes("create_return_request_tool")) setRequestCreated(true);
        const textPart = (event.content?.parts ?? [])
          .map((part) => part.text)
          .filter((value): value is string => Boolean(value))
          .join(" ");
        if (!textPart) return;
        reply = textPart;
        setMessages((items) => {
          const last = items[items.length - 1];
          return last?.role === "agent"
            ? [...items.slice(0, -1), { role: "agent", text: reply }]
            : [...items, { role: "agent", text: reply }];
        });
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        frames.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (!reply) setMessages((items) => [...items, { role: "agent", text: "I could not complete that request." }]);
    } catch {
      setMessages((items) => [...items, { role: "agent", text: "Support is unavailable right now." }]);
    } finally {
      setRunning(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (!clean) return;
    setMessage("");
    void send(clean);
  };

  return (
    <main className={`${styles.page} ${styles.recoveryPage}`}>
      <header>
        <Link href="/cases" className={styles.logo}>NORTHSTAR<span>TRUST LAB / PURCHASE RECOVERY</span></Link>
        <Link href="/cases" className={styles.back}>← All cases</Link>
      </header>
      <section className={styles.recoveryHero}>
        <p className={styles.label}>HUMAN RECOVERY</p>
        <h1>The purchase you can still undo.</h1>
        <p>Alex verifies the return policy and available exchange options before making a promise.</p>
      </section>
      <section className={styles.recoveryWorkspace}>
        <aside className={styles.recoveryEvidence}>
          <span className={styles.label}>ORDER NS-7714</span>
          <h2>Aero Runner 01</h2>
          <p>Purchased 8 days ago · Return window 30 days</p>
          <strong>{requestCreated ? "REQUEST OPENED" : "ELIGIBILITY NOT YET CHECKED"}</strong>
          <div className={styles.recoveryActions}>
            <button disabled={running || !sessionId} onClick={() => void send("I want to return Aero Runner 01 for a refund.")}>Return for refund</button>
            <button disabled={running || !sessionId} onClick={() => void send("I want to exchange Aero Runner 01 for City Walker 02.")}>Exchange for City Walker</button>
          </div>
        </aside>
        <section className={styles.recoveryChat}>
          <div className={styles.supportHead}><span className={styles.label}>NORTHSTAR RECOVERY</span><strong>{running ? "Checking policy..." : "Ready to verify"}</strong></div>
          <div className={styles.messages}>
            {messages.map((item, index) => <div key={`${item.role}-${index}`} className={item.role === "customer" ? styles.customerMessage : styles.agentMessage}><span>{item.role === "customer" ? "You" : "Alex"}</span><p>{item.text}</p></div>)}
          </div>
          <form className={styles.composer} onSubmit={submit}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Alex what you want to change..." disabled={!sessionId || running} /><button disabled={!sessionId || running}>Send →</button></form>
        </section>
      </section>
      <footer className={styles.recoveryFooter}>
        <span>PURCHASE RECOVERY / NORTHSTAR SUPPLY CO.</span>
        <span>Evidence first. Action only after eligibility is verified.</span>
      </footer>
    </main>
  );
}

function CartConcierge() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "agent", text: "Tell Alex what is making you hesitate." },
  ]);
  const [running, setRunning] = useState(false);
  const [includeCity, setIncludeCity] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [offerDecision, setOfferDecision] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [showChat, setShowChat] = useState(false);
  const initialized = useRef(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const nextMessageId = useRef(1);
  const pendingRequests = useRef(0);
  const requestQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void fetch(`${agentUrl}/apps/agent/users/cart-concierge/sessions`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        const id = session?.id ?? session?.sessionId;
        setSessionId(id ?? null);
        if (id) {
          toast.custom((toastId) => (
            <div className={styles.cartToast}>
              <span className={styles.conciergeAvatar}>A</span>
              <div>
                <strong>Alex noticed you may be unsure</strong>
                <p>You have compared this product several times.</p>
                <div className={styles.toastActions}>
                  <button
                    onClick={() => {
                      setIncludeCity(true);
                      toast.dismiss(toastId);
                    }}
                  >
                    Keep both
                  </button>
                  <button
                    onClick={() => {
                      setIncludeCity(false);
                      toast.dismiss(toastId);
                    }}
                  >
                    Keep Aero only
                  </button>
                  <button
                    onClick={() => {
                      toast.dismiss(toastId);
                      setShowChat(true);
                    }}
                  >
                    Ask Alex
                  </button>
                </div>
              </div>
            </div>
          ));
        }
      });
  }, []);
    const updateReply = (frame: string, replyId: number) => {
      const data = frame
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (!data) return false;
      let event: AgentEvent;
      try {
        event = JSON.parse(data) as AgentEvent;
      } catch {
        return false;
      }
      const comparison = (event.content?.parts ?? [])
        .map((part) => part.functionResponse)
        .find((response) => response?.name === "compare_products_tool")?.response;
      const completedResponse = (event.content?.parts ?? [])
        .map((part) => part.functionCall)
        .find((call) => call?.name === "complete_customer_response_tool")?.args?.message;
      const products = comparison?.data ?? [];
      const setReply = (text: string) => {
        setMessages((current) => {
          const replyExists = current.some((chatMessage) => chatMessage.id === replyId);
          if (replyExists) {
            return current.map((chatMessage) =>
              chatMessage.id === replyId ? { ...chatMessage, text } : chatMessage,
            );
          }
          return [...current, { id: replyId, role: "agent", text }];
        });
      };
      if (products.length >= 2) {
        const aero = products.find((product) => product.sku === "AERO-01");
        const city = products.find((product) => product.sku === "CITY-02");
        const comparisonText = aero && city
          ? `${aero.name} is the better pick if you are planning to run: it is the running shoe at $${aero.price_usd}. ${city.name} is the better pick for casual everyday wear at $${city.price_usd}. Based on what you told me, choose Aero if you want to commit to running; choose City if you want the pair you are more likely to wear casually.`
          : `I found ${products.length} products in the catalog, but I could not identify the comparison pair.`;
        setReply(comparisonText);
        return true;
      }
      if (completedResponse) {
        setReply(completedResponse);
        if (/\$25(?:\.00)? discount|offer/i.test(completedResponse)) {
          setOfferDecision("pending");
        }
        return true;
      }
      const partText = (event.content?.parts ?? [])
        .map((part) => part.text)
        .filter((part): part is string => Boolean(part))
        .join(" ");
      if (!partText) return false;
      setReply(partText);
      return true;
    };
  const ask = async (
    text: string,
    activeSession = sessionId,
    showCustomerMessage = true,
  ) => {
    if (!activeSession) return;
    const replyId = nextMessageId.current++;
    if (showCustomerMessage) {
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "customer", text },
      ]);
    }
    pendingRequests.current += 1;
    setRunning(true);
    let releaseRequest!: () => void;
    const requestTurn = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const previousRequest = requestQueue.current;
    requestQueue.current = previousRequest.then(() => requestTurn);
    await previousRequest;
    try {
      const response = await fetch(`${agentUrl}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          appName: "agent",
          userId: "cart-concierge",
          sessionId: activeSession,
          streaming: true,
          newMessage: {
            role: "user",
            parts: [
              {
                text: [
                  "System context: customer compared AERO-01 four times, started checkout " +
                    "twice, cart value $823. The cart contains AERO-01 (Aero Runner 01) " +
                    "and CITY-02 (City Walker 02). Compare these exact products using " +
                    "real catalog/context data.",
                  `Customer: ${text}`,
                ].join("\n"),
              },
            ],
          },
        }),
      });
      if (!response.ok) throw new Error(`agent request failed: ${response.status}`);
      if (!response.body) throw new Error("offline");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;
      let comparedProducts = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const parsedText = updateReply(frame, replyId);
          receivedText = receivedText || parsedText;
          comparedProducts = comparedProducts || frame.includes('"name":"compare_products_tool"');
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) {
        const parsedText = updateReply(buffer, replyId);
        receivedText = receivedText || parsedText;
        comparedProducts = comparedProducts || buffer.includes('"name":"compare_products_tool"');
      }
      if (!receivedText) {
        setMessages((current) =>
          current.some((chatMessage) => chatMessage.id === replyId)
            ? current.map((chatMessage) =>
                chatMessage.id === replyId
                  ? {
                      ...chatMessage,
                      text: comparedProducts
                        ? "I checked the catalog, but the product records are unavailable right now. Please try again shortly."
                        : "Alex finished checking, but did not return a customer-facing answer. Please try again.",
                    }
                  : chatMessage,
              )
            : [
                ...current,
                {
                  id: replyId,
                  role: "agent",
                  text: comparedProducts
                    ? "I checked the catalog, but the product records are unavailable right now. Please try again shortly."
                    : "Alex finished checking, but did not return a customer-facing answer. Please try again.",
                },
              ],
        );
      }
    } catch {
      setMessages((current) =>
        current.some((chatMessage) => chatMessage.id === replyId)
          ? current.map((chatMessage) =>
              chatMessage.id === replyId
                ? { ...chatMessage, text: "Alex could not respond right now. Please try again." }
                : chatMessage,
            )
          : [
              ...current,
              { id: replyId, role: "agent", text: "Alex could not respond right now. Please try again." },
            ],
      );
    } finally {
      releaseRequest();
      pendingRequests.current -= 1;
      setRunning(pendingRequests.current > 0);
    }
  };
  const submitCartMessage = (event: FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (!clean || !sessionId) return;
    setMessage("");
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }
    void ask(clean);
  };
  const chooseOffer = (decision: "accepted" | "declined") => {
    if (running || offerDecision !== "pending") return;
    setOfferDecision(decision);
    if (decision === "accepted") setAppliedDiscount(25);
  };
  const removeCityWalker = () => {
    if (running || !includeCity) return;
    setIncludeCity(false);
    void ask("Remove City Walker 02 from my cart. I want to keep Aero Runner 01.");
  };
  const subtotal = includeCity ? 823 : 428;
  const total = subtotal - appliedDiscount;
  return (
    <main className={`${styles.page} ${styles.cartPage}`}>
      <Toaster position="top-right" closeButton richColors />
      <header>
        <Link href="/cases" className={styles.logo}>
          NORTHSTAR<span>TRUST LAB / CART CONCIERGE</span>
        </Link>
        <Link href="/cases" className={styles.back}>
          ← All cases
        </Link>
      </header>
      <section className={styles.cartTitle}>
        <p className={styles.label}>
          {includeCity ? "YOUR CART / 02 ITEMS" : "YOUR CART / 01 ITEM"}
        </p>
        <h1>Review your order</h1>
        <p>Take a moment. Alex noticed you were comparing options and is ready to help.</p>
      </section>
      <section className={styles.cartShell}>
        <div className={styles.cartLineItem}>
          <div className={styles.cartProductImage} aria-label="Abstract Aero Runner product image">
            AERO
          </div>
          <div>
            <span className={styles.label}>YOUR CART / 01 ITEM</span>
            <h2>Aero Runner 01</h2>
            <p>Cloud / Cobalt · Size 10 · Quantity 1</p>
          </div>
          <strong>$428.00</strong>
        </div>
        {includeCity && (
          <div className={styles.cartLineItem}>
            <div
              className={`${styles.cartProductImage} ${styles.cityProductImage}`}
              aria-label="Abstract City Walker product image"
            >
              CITY
            </div>
            <div>
              <span className={styles.label}>ADDED TO CART</span>
              <h2>City Walker 02</h2>
              <p>Stone / Sand · Size 10 · Quantity 1</p>
            </div>
            <strong>$395.00</strong>
          </div>
        )}
        <div className={styles.cartSummary}>
          <span>Subtotal</span>
          <strong>${subtotal.toFixed(2)}</strong>
          <span>Delivery</span>
          <strong>Free</strong>
          {appliedDiscount > 0 && (
            <>
              <span>Alex offer</span>
              <strong>-${appliedDiscount.toFixed(2)}</strong>
            </>
          )}
          <span className={styles.cartTotalLabel}>Total</span>
          <strong className={styles.cartTotalValue}>${total.toFixed(2)}</strong>
        </div>
      </section>
      {showChat && (
        <section className={styles.cartChatDrawer}>
          <div className={styles.cartChatHeading}>
            <span className={styles.conciergeAvatar}>A</span>
            <div>
              <strong>Alex is helping with your decision</strong>
              <small>Shopping concierge · {running ? "Thinking..." : "Online"}</small>
            </div>
          </div>
          <div className={styles.cartChatMessages} aria-live="polite">
            {messages.map((chatMessage, index) => (
              <p
                className={
                  chatMessage.role === "customer"
                    ? styles.cartCustomerMessage
                    : styles.cartAgentMessage
                }
                key={`${chatMessage.role}-${index}`}
              >
                {chatMessage.text}
              </p>
            ))}
          </div>
          {offerDecision === "pending" && (
            <div className={styles.cartOfferActions}>
              <span>Offer available</span>
              <button type="button" onClick={() => chooseOffer("accepted")} disabled={running}>
                Accept $25 offer
              </button>
              <button type="button" onClick={() => chooseOffer("declined")} disabled={running}>
                Decline
              </button>
              {includeCity && (
                <button type="button" onClick={removeCityWalker} disabled={running}>
                  Remove City Walker
                </button>
              )}
            </div>
          )}
          <form onSubmit={submitCartMessage}>
            <textarea
              ref={messageInputRef}
              value={message}
              onChange={(event) => {
                event.currentTarget.style.height = "auto";
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
                setMessage(event.currentTarget.value);
              }}
              placeholder="Ask Alex about these products..."
              disabled={!sessionId}
              rows={1}
            />
            <button disabled={!sessionId}>Send →</button>
          </form>
        </section>
      )}
      <footer>
        <span>CART REVIEW / NORTHSTAR SUPPLY CO.</span>
        <span>Alex reached out because your cart showed hesitation.</span>
      </footer>
    </main>
  );
}

const friendlyEvent = (event: string) => {
  if (event.includes("transfer_to_agent") || event.includes("Transferred"))
    return "Connecting you with a delivery specialist";
  if (event.includes("get_order_status")) return "Reviewing your order and latest scan";
  if (event.includes("recover_delayed_shipment")) return "Applying your delivery recovery plan";
  if (event.includes("contact_carrier")) return "Reaching out to the carrier";
  if (event.includes("resolve_delivery")) return "Checking recovery policy and compensation";
  if (event.includes("Support decision")) return "Preparing your next update";
  if (event.includes("Customer message")) return "Reading your message";
  if (event.includes("Querying")) return "Investigating your shipment";
  if (event.includes("failed")) return "Support needs a human follow-up";
  return event;
};

export default function CasePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = (params.caseId in caseConfigs ? params.caseId : "delivery") as CaseId;
  const current = caseConfigs[caseId];
  if (caseId === "abuse") return <BoundaryReview />;
  if (caseId === "recovery") return <PurchaseRecovery />;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<string[]>(["Preparing support"]);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [humanHandoff, setHumanHandoff] = useState(false);
  const [recoveryStarted, setRecoveryStarted] = useState(false);

  useEffect(() => {
    setMessages([
      {
        role: "agent",
        text: [
          `Northstar support is ready to help with ${current.label.toLowerCase()}.`,
          "Tell me what happened.",
        ].join(" "),
      },
    ]);
    const createSession = async () => {
      try {
        const response = await fetch(`${agentUrl}/apps/agent/users/${userId}/sessions`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("session");
        const session = await response.json();
        setSessionId(session.id ?? session.sessionId);
        setEvents(["Support ready"]);
      } catch {
        setEvents(["Support is offline"]);
      }
    };
    void createSession();
  }, [caseId, current.label]);

  const sendToAgent = async (text: string) => {
    setMessages((items) => [...items, { role: "customer", text }]);
    setRunning(true);
    setHumanHandoff(false);
    setRecoveryStarted(false);
    setEvents((items) => [...items, "Customer message received", "Investigating your request"]);
    try {
      if (!sessionId) throw new Error("session");
      const response = await fetch(`${agentUrl}/run_sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          appName: "agent",
          userId,
          sessionId,
          streaming: true,
          newMessage: {
            role: "user",
            parts: [{ text: `${current.context}\n\nCustomer message: ${text}` }],
          },
        }),
      });
      if (!response.ok || !response.body) throw new Error("request");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      let toolReports: string[] = [];
      let agentError: AgentEvent | undefined;
      const consumeEvent = (event: AgentEvent) => {
        const rawEvents = [
          event.actions?.transferToAgent ? `Transferred to ${event.actions.transferToAgent}` : "",
          ...(event.content?.parts ?? []).flatMap((part) =>
            part.functionCall
              ? [`Calling ${part.functionCall.name ?? "tool"}`]
              : part.functionResponse
                ? [`Tool completed: ${part.functionResponse.name ?? "tool"}`]
                : [],
          ),
          event.errorMessage ? `${event.author ?? "Support"} failed` : "",
        ].filter(Boolean);
        if (event.errorMessage) agentError = event;
        for (const part of event.content?.parts ?? [])
          if (part.functionResponse?.response?.report)
            toolReports.push(part.functionResponse.response.report);
        const textPart = (event.content?.parts ?? [])
          .map((part) => part.text)
          .filter((value): value is string => Boolean(value))
          .join(" ");
        if (textPart) {
          reply = textPart;
          if (/priority|recovery credit|carrier contacted/i.test(textPart))
            setRecoveryStarted(true);
          if (handoffPattern.test(textPart)) setHumanHandoff(true);
          setMessages((items) => {
            const last = items[items.length - 1];
            return last?.role === "agent"
              ? [...items.slice(0, -1), { role: "agent", text: reply }]
              : [...items, { role: "agent", text: reply }];
          });
        }
        if (rawEvents.length) setEvents((items) => [...items, ...rawEvents]);
      };
      const consumeChunk = (chunk: string) => {
        buffer += chunk;
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame
            .split("\n")
            .find((line) => line.startsWith("data: "))
            ?.slice(6);
          if (data) consumeEvent(JSON.parse(data) as AgentEvent);
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        consumeChunk(decoder.decode(value, { stream: true }));
      }
      consumeChunk(decoder.decode());
      setEvents((items) => [...items, "Update ready"]);
      const finalText =
        reply ||
        toolReports.join(" ") ||
        (agentError
          ? "A support specialist will review this next."
          : "Support completed the investigation.");
      if (handoffPattern.test(finalText)) setHumanHandoff(true);
      if (/priority|recovery credit|carrier contacted/i.test(finalText)) setRecoveryStarted(true);
      setMessages((items) => {
        const last = items[items.length - 1];
        return last?.role === "agent"
          ? [...items.slice(0, -1), { role: "agent", text: finalText }]
          : [...items, { role: "agent", text: finalText }];
      });
    } catch {
      setEvents((items) => [...items, "Support is unavailable"]);
      setMessages((items) => [
        ...items,
        { role: "agent", text: "I could not reach support right now. Please try again shortly." },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = message.trim();
    if (!clean || running || !sessionId) return;
    setMessage("");
    void sendToAgent(clean);
  };
  const startSupport = () => {
    if (!running && sessionId) void sendToAgent("The package stopped moving");
  };
  const visibleEvents = events
    .slice(-8)
    .map(friendlyEvent)
    .filter((event, index, list) => list.indexOf(event) === index);

  return (
    <main className={styles.page}>
      <header>
        <Link href="/cases" className={styles.logo}>
          NORTHSTAR<span>TRUST LAB / CASE FILE</span>
        </Link>
        <Link href="/cases" className={styles.back}>
          ← All cases
        </Link>
      </header>
      <section className={styles.orderHeader}>
        <div>
          <p className={styles.label}>{current.label}</p>
          <h1>{current.title}</h1>
          <p className={styles.subtitle}>
            Order NS-8821 · In transit from Phoenix to Denver · Last scan in Durango 48 hours ago
          </p>
        </div>
        <div className={styles.orderStatus}>
          <strong>{sessionId ? "Support online" : "Connecting"}</strong>
          <span>Priority recovery available</span>
          <button className={styles.run} disabled={running || !sessionId} onClick={startSupport}>
            {running ? "Investigating..." : "Reach out to support"}
          </button>
        </div>
      </section>
      <section className={styles.statusStrip}>
        <div>
          <span>SHIPMENT</span>
          <strong>IN TRANSIT DELAYED</strong>
        </div>
        <div>
          <span>RECOVERY</span>
          <strong>PRIORITY + $25 CREDIT</strong>
        </div>
        <div>
          <span>NEXT UPDATE</span>
          <strong>WITHIN 24 HOURS</strong>
        </div>
      </section>
      <section className={styles.mainWorkspace}>
        <div className={styles.mapColumn}>
          <div className={styles.mapPanel}>
            <DeliveryMap />
          </div>
          <div className={styles.evidence}>
            <span className={styles.label}>SHIPMENT DETAILS</span>
            {current.facts.map((fact) => (
              <div key={fact}>
                <span>{fact}</span>
                <i />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.conversation}>
          <div className={styles.supportHead}>
            <span className={styles.label}>NORTHSTAR SUPPORT</span>
            <strong>
              {humanHandoff
                ? "Human specialist connected"
                : running
                  ? "Investigating..."
                  : "Ready to listen"}
            </strong>
          </div>
          {humanHandoff && (
            <div className={styles.handoffCard}>
              <span className={styles.handoffIcon}>↗</span>
              <div>
                <strong>Human review requested</strong>
                <p>
                  A Northstar specialist has the order context and will review additional
                  compensation.
                </p>
                <small>HANDOFF OPEN · NO REPETITION REQUIRED</small>
              </div>
            </div>
          )}
          <div className={styles.messages}>
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={item.role === "customer" ? styles.customerMessage : styles.agentMessage}
              >
                <span>
                  {item.role === "customer"
                    ? "You"
                    : humanHandoff
                      ? "Northstar specialist"
                      : "Northstar support"}
                </span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <form className={styles.composer} onSubmit={submit}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell support what happened..."
              disabled={!sessionId || running}
            />
            <button disabled={!sessionId || running}>Send →</button>
          </form>
        </div>
      </section>
      <section className={styles.activity}>
        <button onClick={() => setShowDetails((value) => !value)}>
          <span className={styles.label}>INVESTIGATION DETAILS</span>
          <strong>{showDetails ? "Hide activity ↑" : "See what support is doing →"}</strong>
        </button>
        {showDetails && (
          <div className={styles.activityList}>
            {visibleEvents.map((event, index) => (
              <div key={`${event}-${index}`}>
                <i />
                {event}
              </div>
            ))}
          </div>
        )}
      </section>
      <footer>
        <span>CASE {caseId.toUpperCase()}</span>
        <span>Northstar support · Evidence → action → update</span>
      </footer>
    </main>
  );
}
