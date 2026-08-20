// components/console/dashboard/ConversionFunnel.tsx
//
// The "Phễu chuyển đổi" bars. Each bar is a fixed-width ink block (white label
// on the black fill — the action-ink pairing) with its count to the right, and
// the drop-off to the next stage printed under it in the fail tone.

import { Card } from '@/components/console/ui/Card';

export interface FunnelStage {
  label: string;
  value: string;
  width: string;
  drop?: string;
}

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
        Phễu chuyển đổi
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-[30px] items-center overflow-hidden whitespace-nowrap px-2.5 text-[11px] font-semibold text-[var(--adm-action-ink)]"
                style={{
                  width: stage.width,
                  minWidth: stage.label === 'Mua hàng' ? 44 : undefined,
                  backgroundColor: stage.label === 'Mua hàng' ? 'var(--adm-ok-ink)' : 'var(--adm-ink)',
                }}
              >
                {stage.label}
              </div>
              <span className="adm-num w-16 font-mono text-[13px] font-bold text-[var(--adm-ink)]">
                {stage.value}
              </span>
            </div>
            {stage.drop ? (
              <div className="pl-1 text-[10px] font-medium text-[var(--adm-fail-ink)]">
                {stage.drop}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
