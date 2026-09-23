import Link from "next/link";
import styles from "./page.module.css";
import type { CaseSummary } from "./case-data";

type Props = {
  item: CaseSummary;
  index: number;
};

export function CaseCard({ item, index }: Props) {
  return (
    <Link href={`/cases/${item.id}`} className={`${styles.caseCard} ${styles[`case${index + 1}`]}`}>
      <span>
        0{index + 1} / {item.label}
      </span>
      <h2>{item.title}</h2>
      <p>{item.detail}</p>
      <b>Open case →</b>
    </Link>
  );
}
