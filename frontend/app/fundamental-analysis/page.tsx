import { getStocks } from "@/lib/db";
import FundamentalClient from "@/components/FundamentalClient";

export const metadata = { title: "Phân tích tài chính — VN Stock" };
export const revalidate = 3600;

export default async function FundamentalAnalysisPage() {
  const { data: stocks } = await getStocks().catch(() => ({ data: [] as any[] }));
  return <FundamentalClient allStocks={stocks} />;
}
