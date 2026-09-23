import Link from "next/link";
import { CaseCard } from "./CaseCard";
import { caseSummaries } from "./case-data";
import styles from "./page.module.css";

export default function CasesPage() {
  return (
    <main className={styles.page}>
      <header>
        <Link href="/" className={styles.logo}>
          NORTHSTAR<span>TRUST LAB / CASE FILES</span>
        </Link>
        <Link href="/" className={styles.back}>
          ← Storefront
        </Link>
      </header>
      <section className={styles.hero}>
        <p>REAL SCENARIOS / NOT CHAT PROMPTS</p>
        <h1>
          Five moments
          <br />
          <em>where trust is earned.</em>
        </h1>
        <span>
          Each case has customer context, operational evidence, an agent decision, and a visible
          consequence.
        </span>
      </section>
      <section className={styles.grid}>
        {caseSummaries.map((item, index) => (
          <CaseCard item={item} index={index} key={item.id} />
        ))}
      </section>
      <footer>
        <span>PROJECT EXECUTIVE / CASE FILES</span>
        <span>Every case runs through the live agent.</span>
      </footer>
    </main>
  );
}
