// src/backend/discord-bot/modules/signups/interactions.js
/**
 * Interactions (Buttons/Select/Modal) für An-/Abmeldung
 * - ruft NICHT HTTP, sondern den Bot-Adapter (oben) -> signupsService
 */
const { getClient } = require("../../core/client.js");
const { prisma } = require("../../../prismaClient.js");
const { signupNormal, signupLootbuddy, cancel } = require("./service.js");
const { syncRaid } = require("../raids/sync.js");

const STATE = new Map(); // key `${userId}:${raidId}` → { charId, role, saved, klass }

const IDs = {
  btnSignup: (raidId) => `raid_signup_${raidId}`,
  btnCancel: (raidId) => `raid_cancel_${raidId}`,
  btnLoot:   (raidId) => `raid_loot_${raidId}`,

  selChar:   (raidId) => `sel_char_${raidId}`,
  selRole:   (raidId) => `sel_role_${raidId}`,
  selSaved:  (raidId) => `sel_saved_${raidId}`,
  selClass:  (raidId) => `sel_class_${raidId}`,

  btnProceedSignup: (raidId) => `signup_go_${raidId}`,
  btnProceedLoot:   (raidId) => `loot_go_${raidId}`,

  modalSignupNote:  (raidId) => `modal_signup_note_${raidId}`,
  modalLootNote:    (raidId) => `modal_loot_note_${raidId}`,
};

function parseId(prefix, id) {
  const m = new RegExp(`^${prefix}_(\\d+)$`).exec(id);
  return m ? Number(m[1]) : null;
}
function classesList() {
  return [
    "Warrior","Paladin","Hunter","Rogue","Priest","Death Knight","Shaman","Mage","Warlock","Monk","Druid","Demon Hunter","Evoker",
  ];
}

async function ensureHandlersOnce() {
  const { client, discord } = await getClient();
  if (!client || client._signupHandlersInstalled) return;

  client.on("interactionCreate", async (interaction) => {
    try {
      // ───────────────── Buttons Einstieg
      if (interaction.isButton()) {
        const id = interaction.customId;
        let raidId;

        // Abmelden
        if ((raidId = parseId("raid_cancel", id)) != null) {
          const result = await cancel(raidId, interaction.user.id);
          await interaction.reply({
            content: result.missing ? "Du warst nicht angemeldet." : "❎ Abgemeldet.",
            ephemeral: true,
          });
          return;
        }

        // Lootbuddy
        if ((raidId = parseId("raid_loot", id)) != null) {
          STATE.set(`${interaction.user.id}:${raidId}`, {});
          const row1 = new discord.ActionRowBuilder().addComponents(
            new discord.StringSelectMenuBuilder()
              .setCustomId(IDs.selClass(raidId))
              .setPlaceholder("Klasse wählen")
              .addOptions(classesList().map(c => ({ label: c, value: c })))
          );
          const row2 = new discord.ActionRowBuilder().addComponents(
            new discord.ButtonBuilder().setCustomId(IDs.btnProceedLoot(raidId)).setLabel("Weiter").setStyle(discord.ButtonStyle.Primary),
            new discord.ButtonBuilder().setCustomId("close_ephemeral").setLabel("Abbrechen").setStyle(discord.ButtonStyle.Secondary)
          );
          await interaction.reply({ content: "Lootbuddy-Anmeldung", components: [row1, row2], ephemeral: true });
          return;
        }

        // Normale Anmeldung
        if ((raidId = parseId("raid_signup", id)) != null) {
          STATE.set(`${interaction.user.id}:${raidId}`, {});

          // Chars des Users (direkt via Prisma lesen ist ok; reine Read-Query)
          const chars = await prisma.boosterChar.findMany({
            where: { userId: String(interaction.user.id) },
            orderBy: [{ name: "asc" }],
            select: { id: true, name: true, realm: true, class: true, itemLevel: true },
          });

          if (!chars.length) {
            await interaction.reply({ content: "Du hast noch keine Chars hinterlegt. Bitte im Web-UI anlegen.", ephemeral: true });
            return;
          }

          const charOptions = chars.map(c => ({
            label: `${c.name}${c.realm ? "-" + c.realm : ""} ${c.class ? `(${c.class})` : ""}`,
            value: String(c.id),
            description: c.itemLevel ? `ilvl ${c.itemLevel}` : undefined,
          }));

          const row1 = new discord.ActionRowBuilder().addComponents(
            new discord.StringSelectMenuBuilder().setCustomId(IDs.selChar(raidId)).setPlaceholder("Char wählen").addOptions(charOptions)
          );
          const row2 = new discord.ActionRowBuilder().addComponents(
            new discord.StringSelectMenuBuilder().setCustomId(IDs.selRole(raidId)).setPlaceholder("Rolle wählen").addOptions([
              { label: "Tank", value: "TANK" },
              { label: "Heal", value: "HEAL" },
              { label: "DPS",  value: "DPS"  },
            ])
          );
          const row3 = new discord.ActionRowBuilder().addComponents(
            new discord.StringSelectMenuBuilder().setCustomId(IDs.selSaved(raidId)).setPlaceholder("Saved/Unsaved").addOptions([
              { label: "Saved",   value: "saved"   },
              { label: "Unsaved", value: "unsaved" },
            ])
          );
          const row4 = new discord.ActionRowBuilder().addComponents(
            new discord.ButtonBuilder().setCustomId(IDs.btnProceedSignup(raidId)).setLabel("Weiter").setStyle(discord.ButtonStyle.Success),
            new discord.ButtonBuilder().setCustomId("close_ephemeral").setLabel("Abbrechen").setStyle(discord.ButtonStyle.Secondary)
          );

          await interaction.reply({ content: "Raid-Anmeldung", components: [row1, row2, row3, row4], ephemeral: true });
          return;
        }

        // Weiter → Modal (Signup)
        if ((raidId = parseId("signup_go", id)) != null) {
          const key = `${interaction.user.id}:${raidId}`;
          const st = STATE.get(key) || {};
          if (!st.charId || !st.role || st.saved == null) {
            await interaction.reply({ content: "Bitte Char, Rolle und Saved/Unsaved wählen.", ephemeral: true });
            return;
          }
          const modal = new discord.ModalBuilder().setCustomId(IDs.modalSignupNote(raidId)).setTitle("Optionale Notiz");
          const input = new discord.TextInputBuilder().setCustomId("note").setLabel("Notiz").setStyle(discord.TextInputStyle.Paragraph).setRequired(false);
          modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }

        // Weiter → Modal (Lootbuddy)
        if ((raidId = parseId("loot_go", id)) != null) {
          const key = `${interaction.user.id}:${raidId}`;
          const st = STATE.get(key) || {};
          if (!st.klass) {
            await interaction.reply({ content: "Bitte eine Klasse wählen.", ephemeral: true });
            return;
          }
          const modal = new discord.ModalBuilder().setCustomId(IDs.modalLootNote(raidId)).setTitle("Optionale Notiz (Lootbuddy)");
          const input = new discord.TextInputBuilder().setCustomId("note").setLabel("Notiz").setStyle(discord.TextInputStyle.Paragraph).setRequired(false);
          modal.addComponents(new discord.ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }

        if (id === "close_ephemeral") {
          await interaction.reply({ content: "OK.", ephemeral: true });
          return;
        }
      }

      // ───────────────── Select Menus: Zustand zwischenspeichern
      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;
        const raidId =
          parseId("sel_char", id) ?? parseId("sel_role", id) ?? parseId("sel_saved", id) ?? parseId("sel_class", id);

        if (raidId != null) {
          const key = `${interaction.user.id}:${raidId}`;
          const st = STATE.get(key) || {};
          const val = interaction.values?.[0];

          if (id.startsWith("sel_char_"))  st.charId = Number(val);
          if (id.startsWith("sel_role_"))  st.role = String(val);
          if (id.startsWith("sel_saved_")) st.saved = val === "saved";
          if (id.startsWith("sel_class_")) st.klass = String(val);

          STATE.set(key, st);
          await interaction.deferUpdate();
          return;
        }
      }

      // ───────────────── Modals: endgültig schreiben via Service
      if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        // Normale Anmeldung
        let raidId = parseId("modal_signup_note", id);
        if (raidId != null) {
          const key = `${interaction.user.id}:${raidId}`;
          const st = STATE.get(key) || {};
          const note = interaction.fields.getTextInputValue("note") || null;

          const member = interaction.guild?.members?.resolve(interaction.user.id);
          const display = member?.displayName || interaction.user.globalName || interaction.user.username || interaction.user.id;

          const result = await signupNormal({
            raidId,
            userId: interaction.user.id,
            displayName: display,
            charId: st.charId,
            role: st.role,
            saved: !!st.saved,
            note,
          });

          STATE.delete(key);
          await interaction.reply({ content: result.already ? "Du bist bereits angemeldet." : "✅ Angemeldet.", ephemeral: true });
          return;
        }

        // Lootbuddy
        raidId = parseId("modal_loot_note", id);
        if (raidId != null) {
          const key = `${interaction.user.id}:${raidId}`;
          const st = STATE.get(key) || {};
          const note = interaction.fields.getTextInputValue("note") || null;

          const member = interaction.guild?.members?.resolve(interaction.user.id);
          const display = member?.displayName || interaction.user.globalName || interaction.user.username || interaction.user.id;

          const result = await signupLootbuddy({
            raidId,
            userId: interaction.user.id,
            displayName: display,
            klass: st.klass,
            note,
          });

          STATE.delete(key);
          await interaction.reply({ content: result.already ? "Du bist bereits angemeldet." : "✅ Als Lootbuddy angemeldet.", ephemeral: true });
          return;
        }
      }
    } catch (e) {
      console.error("[discord-bot] interaction error", e);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Fehler bei der Aktion.", ephemeral: true });
        } else {
          await interaction.followUp({ content: "Fehler bei der Aktion.", ephemeral: true });
        }
      } catch {}
    }
  });

  client._signupHandlersInstalled = true;
}

module.exports = { ensureHandlersOnce };
