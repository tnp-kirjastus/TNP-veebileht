import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = request.headers.get("x-revalidate-token");
  if (token !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { paths = ["/"] } = await request.json();
    for (const path of paths) {
      revalidatePath(path);
    }
    return NextResponse.json({ revalidated: paths });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
