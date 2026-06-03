// src/payload/components/analytics/RankingTable.tsx — presentational ranking table
import type { ReactElement } from 'react';

export type RankingColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

type Props = {
  title: string;
  columns: RankingColumn[];
  rows: Array<Record<string, string | number>>;
  emptyLabel?: string;
};

export function RankingTable({
  title,
  columns,
  rows,
  emptyLabel = 'Chưa có dữ liệu',
}: Props): ReactElement {
  return (
    <section className="dash-table">
      <h3 className="dash-table__title">{title}</h3>

      {rows.length === 0 ? (
        <p className="dash-table__empty">{emptyLabel}</p>
      ) : (
        <div className="dash-table__wrapper">
          <table className="dash-table__table">
            <thead className="dash-table__head">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={
                      col.align === 'right' ? 'dash-table__head dash-table__head--right' : 'dash-table__head'
                    }
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="dash-table__body">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => {
                    const cell = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={
                          col.align === 'right'
                            ? 'dash-table__cell dash-table__cell--right'
                            : 'dash-table__cell'
                        }
                      >
                        {cell ?? '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}