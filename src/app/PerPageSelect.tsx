"use client";

type Props = {
  options: number[];
  value: number;
  hiddenFields: Record<string, string | number>;
};

export default function PerPageSelect({ options, value, hiddenFields }: Props) {
  return (
    <form action="/" method="get">
      {Object.entries(hiddenFields).map(([name, val]) => (
        <input key={name} type="hidden" name={name} value={String(val)} />
      ))}
      <input type="hidden" name="page" value={1} />
      <div className="flex items-center gap-1.5">
        <label className="whitespace-nowrap text-xs text-slate-500">
          На странице:
        </label>
        <select
          name="perPage"
          defaultValue={String(value)}
          onChange={(e) => e.currentTarget.form?.submit()}
          className="cursor-pointer rounded-lg border border-steel bg-white px-2 py-1.5 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
