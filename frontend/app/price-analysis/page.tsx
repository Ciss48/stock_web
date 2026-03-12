import { getStocks } from "@/lib/db";
import PriceAnalysisClient from "@/components/PriceAnalysisClient";

export const metadata = { title: "Phân tích kỹ thuật — VN Stock" };
export const revalidate = 3600;

export default async function PriceAnalysisPage() {
  const { data: stocks } = await getStocks().catch(() => ({ data: [] as any[] }));
  return <PriceAnalysisClient allStocks={stocks} />;
}
