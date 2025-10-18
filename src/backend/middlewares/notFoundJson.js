module.exports = function notFoundJson(req, res) {
  return res.status(404).json({
    ok: false,
    error: 'not_found',
    path: req.originalUrl || req.url,
  });
};
