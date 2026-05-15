const healthResponse = new Response("OK", {
  headers: {
    "content-type": "text/plain; charset=utf-8",
  },
});

export function GET() {
  return healthResponse;
}

export function HEAD() {
  return new Response(null, {
    headers: healthResponse.headers,
  });
}
