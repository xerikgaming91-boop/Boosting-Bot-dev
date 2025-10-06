// src/backend/utils/cycleWindow.js
// CommonJS utility: berechnet das aktuelle und nächste Cycle-Fenster
// Cycle-Regel: Mittwoch 08:00 bis nächsten Mittwoch 07:00 (Europe/Berlin)

const TZ = "Europe/Berlin";

/**
 * Wandelt eine JS-Date in eine Date um, die als lokale Zeit (Europe/Berlin)
 * interpretiert und danach wieder als echte JS-Date (UTC) zurückgegeben wird.
 * So können wir konsistent mit Uhrzeiten in Berlin arbeiten.
 */
function fromLocalParts(year, monthIdx, day, hour = 0, minute = 0, second = 0, ms = 0) {
  // Erzeuge ISO für Europe/Berlin mit Intl und parse zurück in Date
  const dtf = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Wir bauen das Datum zuerst als “normales” Date, ziehen dann die gewünschten Parts
  const tmp = new Date(Date.UTC(year, monthIdx, day, hour, minute, second, ms));
  // (oben ist UTC, aber wir nutzen nur, um Year/Month/Day zu konsistenten Zahlen zu formen)
  const parts = dtf.formatToParts(tmp).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  // parts enthält den lokal formatierten String – wir wollen aber den echten UTC-Zeitpunkt,
  // der dieser lokalen Zeit entspricht. Dafür konstruieren wir ein ISO mit TZ-Offset:

  // yyyy-mm-ddTHH:MM:SS in Europe/Berlin:
  const yyyy = String(year).padStart(4, "0");
  const mm   = String(monthIdx + 1).padStart(2, "0");
  const dd   = String(day).padStart(2, "0");
  const HH   = String(hour).padStart(2, "0");
  const MM   = String(minute).padStart(2, "0");
  const SS   = String(second).padStart(2, "0");

  // Trick: Wir bauen ein Date aus lokalen Komponenten, indem wir den Offset
  // für die gewählte lokale Zeit bestimmen:
  const local = new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.000`);
  // Offset in Minuten (z. B. 60 oder 120 je nach DST). Wir brauchen ihn als ms:
  const offsetMin = -local.getTimezoneOffset(); // lokale Zeit vs. UTC
  // Wir wollen die lokale Berlin-Zeit → rechne auf UTC um:
  const utcMs = local.getTime() - (offsetMin * 60 * 1000);
  return new Date(utcMs);
}

/**
 * Liefert das Cycle-Fenster (start, end) für ein beliebiges Datum.
 * Definition:
 *  - Start: Der letzte Mittwoch um 08:00 (Berlin)
 *  - Ende:  Der darauffolgende Mittwoch um 07:00 (Berlin)
 */
function getCycleWindowFor(dateInput = new Date()) {
  const d = new Date(dateInput);

  // Hole lokales Datum in Berlin
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short", // e.g. Wed
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(d).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  // Wir brauchen Wochentag und Y/M/D als Zahlen
  // Da formatToParts für weekday strings liefert, nehmen wir getUTCDay-Workaround:
  // Ein einfacher Weg: erzeuge einen “lokalen” Date-Klon mit Berlin-Offset.
  const localNow = new Date(d.toLocaleString("en-GB", { timeZone: TZ }));
  // localNow ist "echte" lokale Uhrzeit (Computerzeitpunkt, repräsentiert Berlin-Lokal)

  // Wochentag: JS: 0=Sonntag ... 6=Samstag
  let wd = localNow.getDay(); // 0..6
  // Ziel: letzter Mittwoch (3) 08:00
  // Wie viele Tage zurück bis Mittwoch?
  const daysBackToWed = (wd - 3 + 7) % 7; // wenn heute Mi, 0; Do=1; Di=6; ...
  const startLocal = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate() - daysBackToWed,
    8, 0, 0, 0 // 08:00
  );

  // Ende: nächster Mittwoch 07:00 → das ist Start + 6 Tage + 23 Stunden
  const endLocal = new Date(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate() + 6, 7 + 24, 0, 0, 0);
  // 7 + 24 = 31h nach 08:00 des Startmittwochs → entspricht Mi 07:00 der Folgewoche

  // Jetzt die lokalen Zeitpunkte wieder korrekt als UTC-Date zurückwandeln:
  const start = fromLocalParts(
    startLocal.getFullYear(),
    startLocal.getMonth(),
    startLocal.getDate(),
    startLocal.getHours(),
    startLocal.getMinutes(),
    startLocal.getSeconds(),
    0
  );
  const end = fromLocalParts(
    endLocal.getFullYear(),
    endLocal.getMonth(),
    endLocal.getDate(),
    endLocal.getHours(),
    endLocal.getMinutes(),
    endLocal.getSeconds(),
    0
  );

  return { start, end, timeZone: TZ };
}

/** Aktuelles Fenster (für "jetzt") */
function getCurrentCycleWindow(now = new Date()) {
  return getCycleWindowFor(now);
}

/** Nächstes Fenster (Start = Ende des aktuellen, Ende = +7 Tage - 1h) */
function getNextCycleWindow(now = new Date()) {
  const { end } = getCycleWindowFor(now);
  // nächstes Ende = Ende + 7 Tage
  const nextEndLocal = new Date(end.toLocaleString("en-GB", { timeZone: TZ }));
  nextEndLocal.setDate(nextEndLocal.getDate() + 7);
  const nextStartLocal = new Date(end.toLocaleString("en-GB", { timeZone: TZ })); // gleich dem aktuellen End-Zeitpunkt
  // Endpunkt ist Mi 07:00; nächstes Ende = +7 Tage → wieder Mi 07:00

  const start = fromLocalParts(
    nextStartLocal.getFullYear(),
    nextStartLocal.getMonth(),
    nextStartLocal.getDate(),
    nextStartLocal.getHours(),
    nextStartLocal.getMinutes(),
    nextStartLocal.getSeconds(),
    0
  );
  const endNext = fromLocalParts(
    nextEndLocal.getFullYear(),
    nextEndLocal.getMonth(),
    nextEndLocal.getDate(),
    nextEndLocal.getHours(),
    nextEndLocal.getMinutes(),
    nextEndLocal.getSeconds(),
    0
  );

  return { start, end: endNext, timeZone: TZ };
}

module.exports = {
  TZ,
  getCycleWindowFor,
  getCurrentCycleWindow,
  getNextCycleWindow,
};
