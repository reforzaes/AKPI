
import React from 'react';

interface Props {
  value: number;
  target: number;
}

// StatusBadge displays a status label and color based on a value compared to a target
const StatusBadge: React.FC<Props> = ({ value, target }) => {
  let colorClass = 'bg-red-100 text-red-700 border-red-200';
  let label = 'Lejos';

  // Check if value reaches target or is close to it (80% or more)
  if (value >= target) {
    colorClass = 'bg-green-100 text-green-700 border-green-200';
    label = 'Llegado';
  } else if (value >= target * 0.8) {
    colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    label = 'Cerca';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
