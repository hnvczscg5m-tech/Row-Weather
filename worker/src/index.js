export default {
  async fetch(request) {
    const target =
      "https://www.bom.gov.au/fwo/IDW60801/IDW60801.94610.json";

    const response = await fetch(target, {
      headers: {
        "User-Agent": "Row-Weather"
      }
    });

    const body = await response.text();

    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
