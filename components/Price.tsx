export default function Price({ cents, currency = 'USD' }: { cents?: number | null; currency?: string }) {
    if (cents == null) return <span className="text-gray-500">—</span>;
    const amount = (cents / 100).toLocaleString(undefined, { style: 'currency', currency });
    return <span>{amount}</span>;
}
