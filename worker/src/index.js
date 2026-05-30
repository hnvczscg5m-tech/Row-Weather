export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target || !target.startsWith("https://www.bom.gov.au/")) {
      return new Response("Missing or invalid BOM URL", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
