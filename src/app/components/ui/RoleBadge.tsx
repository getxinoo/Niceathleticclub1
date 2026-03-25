/**
 * RoleBadge.tsx – Styled role indicator pill
 */
import { type UserRole, ROLE_LABELS, ROLE_COLORS } from '../../../lib/permissions';

interface RoleBadgeProps {
  role: UserRole | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function RoleBadge({ role, size = 'sm', showDot = true }: RoleBadgeProps) {
  const validRole = (role in ROLE_LABELS ? role : 'member') as UserRole;
  const colors = ROLE_COLORS[validRole];
  const label = ROLE_LABELS[validRole];

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '5px' : '6px',
        padding: isSmall ? '2px 8px' : '3px 10px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '2px',
        fontFamily: 'var(--font-condensed)',
        fontSize: isSmall ? '10px' : '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: colors.text,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {showDot && (
        <span
          style={{
            width: isSmall ? '5px' : '6px',
            height: isSmall ? '5px' : '6px',
            borderRadius: '50%',
            background: colors.text,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}

export default RoleBadge;
