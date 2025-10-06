// src/backend/services/charService.js
/**
 * Service-Layer für BoosterChar
 * - Validierungen
 * - Business-Logik (z. B. Eindeutigkeit pro User/Name/Realm)
 * - Delegiert DB-Zugriffe ans Model
 * - NEU: Upsert des Users, damit FK nicht bricht
 */

const charModel = require("../models/charModel.js");
const { prisma } = require("../prismaClient.js");

/** Hilfsfunktion: einfache Pflichtfeldprüfung */
function assertFields(obj, fields = []) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === "");
  if (missing.length) {
    const err = new Error("Missing required fields: " + missing.join(", "));
    err.status = 400;
    throw err;
  }
}

/** Nutzer sicherstellen (für FK: BoosterChar.userId -> User.discordId) */
async function ensureUserExists(discordId, displayMaybe) {
  const id = String(discordId);
  const display = displayMaybe || null;
  await prisma.user.upsert({
    where: { discordId: id },
    update: {
      // vorsichtig aktualisieren, falls mal ein Name mitgegeben wurde
      ...(display ? { displayName: display } : {}),
    },
    create: {
      discordId: id,
      username: display,
      displayName: display,
      isRaidlead: false,
      isAdmin: false,
      isOwner: false,
      rolesCsv: null,
      highestRole: null,
      roleLevel: 0,
    },
  });
}

/** Liste aller Chars (optional nach Discord-User filtern) */
exports.getAll = async ({ userId } = {}) => {
  if (userId) {
    return charModel.findMany({ where: { userId: String(userId) } });
  }
  return charModel.findMany();
};

/** Einzelnen Char laden */
exports.getById = async (id) => {
  return charModel.findById(id);
};

/** Char anlegen */
exports.create = async (data) => {
  // Pflichtfelder
  assertFields(data, ["userId", "name", "realm"]);

  // FK: User ggf. automatisch anlegen/aktualisieren
  // Falls du im Request keinen Namen mitschickst, ist das egal – wir legen einen neutralen User an.
  await ensureUserExists(String(data.userId), data.userDisplayName || data.displayName || data.username);

  // Eindeutigkeit pro (userId, name, realm) sicherstellen
  const existing = await charModel.findFirst({
    where: { userId: String(data.userId), name: String(data.name), realm: String(data.realm) },
  });
  if (existing) {
    const err = new Error("Character already exists for this user with same name/realm");
    err.status = 409;
    throw err;
  }

  // Normierung optionaler Felder
  const payload = {
    userId: String(data.userId),
    name: String(data.name),
    realm: String(data.realm),
    class: data.class || null,
    spec: data.spec || null,
    rioScore: data.rioScore != null ? Number(data.rioScore) : null,
    itemLevel: data.itemLevel != null ? Number(data.itemLevel) : null,
    progress: data.progress || null,
    wclUrl: data.wclUrl || null,
  };

  return charModel.create(payload);
};

/** Char updaten */
exports.update = async (id, data) => {
  // Wenn Name/Realm/User geändert werden, prüfen wir die Eindeutigkeit erneut
  if (data.userId || data.name || data.realm) {
    const current = await charModel.findById(id);
    if (!current) {
      const err = new Error("Character not found");
      err.status = 404;
      throw err;
    }
    // Wenn userId geändert wird, sicherstellen, dass der User existiert
    if (data.userId) {
      await ensureUserExists(String(data.userId), data.userDisplayName || data.displayName || data.username);
    }

    const next = {
      userId: String(data.userId ?? current.userId),
      name: String(data.name ?? current.name),
      realm: String(data.realm ?? current.realm),
    };
    // Prüfen, ob ein anderer Char mit denselben Keys existiert
    const clash = await charModel.findFirst({
      where: {
        userId: next.userId,
        name: next.name,
        realm: next.realm,
        NOT: { id: Number(id) },
      },
    });
    if (clash) {
      const err = new Error("Another character with same user/name/realm already exists");
      err.status = 409;
      throw err;
    }
  }

  const patch = {
    // Nur definierte Felder weitergeben
    userId: data.userId !== undefined ? String(data.userId) : undefined,
    name: data.name !== undefined ? String(data.name) : undefined,
    realm: data.realm !== undefined ? String(data.realm) : undefined,
    class: data.class !== undefined ? data.class : undefined,
    spec: data.spec !== undefined ? data.spec : undefined,
    rioScore: data.rioScore !== undefined ? Number(data.rioScore) : undefined,
    itemLevel: data.itemLevel !== undefined ? Number(data.itemLevel) : undefined,
    progress: data.progress !== undefined ? data.progress : undefined,
    wclUrl: data.wclUrl !== undefined ? data.wclUrl : undefined,
  };

  return charModel.update(id, patch);
};

/** Char löschen */
exports.remove = async (id) => {
  // TODO (optional): prüfen, ob Char noch in Signups/Roster referenziert wird
  return charModel.remove(id);
};
