import PublicHomePage from "./public-page";
import { getUserId } from "./services/user-service";
import { redirect } from "next/navigation";

type SearchParams = {
  success?: string;
  error?: string;
};
type Props = { searchParams: Promise<SearchParams> };

export default async function HomePage({ searchParams }: Props) {
  const { success, error } = await searchParams;
  if (error) {
    return <PublicHomePage errors={[error]} />;
  }
  const userId = await getUserId();

  if (!userId) {
    return <PublicHomePage success={success} errors={[error]} />;
  }

  if (success) {
    redirect("/dashboard?success=" + success);
  } else {
    redirect("/dashboard");
  }
}
