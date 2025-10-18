// Wandelt jede Weiterleitung innerhalb von /api in JSON-Fehler (401/403) um,
// damit NIE HTML an den Client geht.
module.exports = function apiJsonGuard(req, res, next) {
  // Nur für API-Routen aktiv
  if (!req.path || !req.path.startsWith('/api')) return next();

  const origRedirect = res.redirect.bind(res);

  res.redirect = function patchedRedirect(statusOrUrl, maybeUrl) {
    let status = 302;
    let url = statusOrUrl;
    if (typeof statusOrUrl === 'number') {
      status = statusOrUrl;
      url = maybeUrl;
    }
    // Statt Redirect -> JSON
    const code = status === 302 ? 401 : status; // 302/307 bei Login => 401
    return res.status(code).json({
      ok: false,
      error: code === 401 ? 'unauthorized' : 'redirect_blocked',
      redirect: url,
    });
  };

  // Falls später jemand res.send('<html>...') machen will, fangen wir's ab
  const origSend = res.send.bind(res);
  res.send = function patchedSend(body) {
    const ct = res.getHeader('content-type');
    if (!ct || String(ct).includes('text/html')) {
      // Erzwinge JSON-Ausgabe
      try {
        // Wenn schon ein Objekt -> normal serialisieren
        if (body && typeof body === 'object') {
          return res.type('application/json; charset=utf-8').json(body);
        }
        // Sonst generische Fehlermeldung
        return res
          .status(res.statusCode && res.statusCode !== 200 ? res.statusCode : 500)
          .json({ ok: false, error: 'non_json_response_blocked', preview: String(body).slice(0, 160) });
      } catch {
        return res.status(500).json({ ok: false, error: 'non_json_response_blocked' });
      }
    }
    return origSend(body);
  };

  // Standard Content-Type für API vorbesetzen (falls keiner gesetzt wird)
  if (!res.getHeader('content-type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  next();
};
