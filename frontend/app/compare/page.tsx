import { api } from "@/lib/api";
import CompareClient from "@/components/CompareClient";

export const revalidate = 3600;

export default async function ComparePage() {
  const stocksRes = await api.stocks().catch(() => ({ data: [] }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">So sánh cổ phiếu</h1>
        <p className="text-slate-500 text-sm mt-1">Chọn 2–5 mã để so sánh xu hướng giá và chỉ số tài chính</p>
      </div>
      <CompareClient allStocks={stocksRes.data} />
    </div>
  );
}
