export function SeverityBadge({ level }) {
  const l = (level || '').toLowerCase();
  return (
    <span className={`badge badge-${l}`}>
      <span className="badge-dot" />
      {level}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  return <span className={`badge badge-${s}`}>{status?.replace('_', ' ')}</span>;
}

export function EquipmentBadge({ level }) {
  const l = (level || '').toLowerCase();
  return <span className={`badge badge-${l}`}>{level}</span>;
}
