const authService = require('./auth.service');

// ─── Auth ────────────────────────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ status: 'success', data: user });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(401).json({ status: 'fail', message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};


exports.refreshToken = async (req, res) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(401).json({ status: 'fail', message: error.message });
  }
};

// ─── Profile ─────────────────────────────────────────────────────────────────


exports.getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(404).json({ status: 'fail', message: error.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(
      req.user.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// ─── Delete My Account ─────────────────────────────
exports.deleteMe = async (req, res) => {
  try {
    const result = await authService.deleteMe(req.user.id);
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};


