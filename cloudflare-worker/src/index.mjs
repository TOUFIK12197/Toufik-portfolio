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

    if (new URL(request.url).pathname !== '/send') {
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

    if (
      !env.RECAPTCHA_SECRET ||
      !env.EMAILJS_SERVICE_ID ||
      !env.EMAILJS_TEMPLATE_ID ||
      !env.EMAILJS_PUBLIC_KEY
    ) {
      console.error('The contact form Worker is missing required configuration.');
      return jsonResponse({ success: false }, 500, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false }, 400, allowedOrigin);
    }

    const fields = {
      name: typeof body?.name === 'string' ? body.name.trim() : '',
      email: typeof body?.email === 'string' ? body.email.trim() : '',
      subject: typeof body?.subject === 'string' ? body.subject.trim() : '',
      message: typeof body?.message === 'string' ? body.message.trim() : '',
      token: body?.token,
      website: body?.website,
    };

    if (typeof fields.website === 'string' && fields.website.length > 0) {
      return jsonResponse({ success: true }, 200, allowedOrigin);
    }

    if (
      typeof fields.name !== 'string' ||
      fields.name.length === 0 ||
      fields.name.length > 120 ||
      typeof fields.email !== 'string' ||
      fields.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) ||
      typeof fields.subject !== 'string' ||
      fields.subject.length === 0 ||
      fields.subject.length > 160 ||
      typeof fields.message !== 'string' ||
      fields.message.length === 0 ||
      fields.message.length > 5000 ||
      typeof fields.token !== 'string' ||
      fields.token.length === 0 ||
      fields.token.length > 4096
    ) {
      return jsonResponse({ success: false }, 400, allowedOrigin);
    }

    const verificationBody = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET,
      response: fields.token,
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
      return jsonResponse(
        { success: false, error: 'captcha_invalid' },
        400,
        allowedOrigin
      );
    }

    let emailResponse;
    try {
      emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': allowedOrigin,
        },
        body: JSON.stringify({
          service_id: env.EMAILJS_SERVICE_ID,
          template_id: env.EMAILJS_TEMPLATE_ID,
          user_id: env.EMAILJS_PUBLIC_KEY,
          template_params: {
            from_name: fields.name,
            reply_to: fields.email,
            subject: fields.subject,
            message: fields.message,
          },
        }),
      });
    } catch (error) {
      console.error('EmailJS request failed.', error);
      return jsonResponse({ success: false }, 502, allowedOrigin);
    }

    if (!emailResponse.ok) {
      console.error(`EmailJS returned ${emailResponse.status}.`);
      return jsonResponse({ success: false }, 502, allowedOrigin);
    }

    return jsonResponse({ success: true }, 200, allowedOrigin);
  },
};
