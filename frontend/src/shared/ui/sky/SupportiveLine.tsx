const line = 'Сказать вслух — уже половина пути';

export function SupportiveLine() {
  return <p className="supportive-line" aria-label={line}>{Array.from(line).map((letter, index) => <span aria-hidden="true" key={index} style={{ '--letter-index': index } as React.CSSProperties}>{letter}</span>)}</p>;
}