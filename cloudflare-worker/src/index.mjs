function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Vary': 'Origin',
    },
  });
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const requestOrigin = request.headers.get('Origin');

    if (!allowedOrigin || requestOrigin !== allowedOrigin) {
      return new Response('Forbidden', { status: 403 });
    }

    if (new URL(request.url).pathname !== '/verify') {
      return jsonResponse({ success: false }, 404, allowedOrigin);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false }, 405, allowedOrigin);
    }

    if (!env.RECAPTCHA_SECRET) {
      console.error('The RECAPTCHA_SECRET Worker secret is not configured.');
      return jsonResponse({ success: false }, 500, allowedOrigin);
    }

    let token;
    try {
      const body = await request.json();
      token = body?.token;
    } catch {
      return jsonResponse({ success: false }, 400, allowedOrigin);
    }

    if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
      return jsonResponse({ success: false }, 400, allowedOrigin);
    }

    const verificationBody = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET,
      response: token,
    });
    let verificationResponse;
    try {
      verificationResponse = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: verificationBody,
        }
      );
    } catch (error) {
      console.error('Google reCAPTCHA verification request failed.', error);
      return jsonResponse({ success: false }, 502, allowedOrigin);
    }

    if (!verificationResponse.ok) {
      console.error(
        `Google reCAPTCHA verification returned ${verificationResponse.status}.`
      );
      return jsonResponse({ success: false }, 502, allowedOrigin);
    }

    let verification;
    try {
      verification = await verificationResponse.json();
    } catch (error) {
      console.error('Google returned an invalid reCAPTCHA response.', error);
      return jsonResponse({ success: false }, 502, allowedOrigin);
    }

    const allowedHostname = new URL(allowedOrigin).hostname;

    if (
      verification.success !== true ||
      verification.hostname !== allowedHostname
    ) {
      return jsonResponse({ success: false }, 200, allowedOrigin);
    }

    return jsonResponse({ success: true }, 200, allowedOrigin);
  },
};
