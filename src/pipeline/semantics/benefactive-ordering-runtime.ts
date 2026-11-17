import type { RuntimeHaruToken } from "../../types/token.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { LookupTables } from "../lookup-tables.js";
import { TranslationUnit, UnitType } from "../translation/unit.js";

export function applyBenefactiveRecipientOrdering(units: TranslationUnit[], tokens: readonly RuntimeHaruToken[], lookups: LookupTables): void {
  let index = 0;
  while (index + 3 < units.length) {
    const recipient = units[index];
    const recipientParticle = units[index + 1];
    const agent = units[index + 2];
    const agentParticle = units[index + 3];
    if (
      recipient === undefined
      || recipientParticle === undefined
      || agent === undefined
      || agentParticle === undefined
      || !isFirstPersonRecipientUnit(recipient, tokens, lookups)
      || !isBenefactiveRecipientParticleUnit(recipientParticle)
      || !isBenefactiveAgentContentUnit(agent)
      || !isBenefactiveAgentParticleUnit(agentParticle)
    ) {
      index += 1;
      continue;
    }
    const moving = units.splice(index + 2, 2);
    units.splice(index, 0, ...moving);
    index += 4;
  }
}

function isFirstPersonRecipientUnit(unit: TranslationUnit, tokens: readonly RuntimeHaruToken[], lookups: LookupTables): boolean {
  if (unit.unitType !== UnitType.CONTENT) {
    return false;
  }
  for (const index of unit.jpIndices) {
    const token = tokens[index];
    if (token !== undefined && (lookups.HONORIFIC_FIRST_PERSON_PRONOUNS.has(token.surface) || lookups.HONORIFIC_FIRST_PERSON_PRONOUNS.has(token.dictionaryForm))) {
      return true;
    }
  }
  return false;
}

function isBenefactiveRecipientParticleUnit(unit: TranslationUnit): boolean {
  return unit.unitType === UnitType.FUNCTIONAL &&
    (unit.jpHead.surface === "は" || unit.jpHead.surface === "も") &&
    unit.particleRole === "benefactive_recipient";
}

function isBenefactiveAgentContentUnit(unit: TranslationUnit): boolean {
  return unit.unitType === UnitType.CONTENT || unit.unitType === UnitType.NUMERAL;
}

function isBenefactiveAgentParticleUnit(unit: TranslationUnit): boolean {
  return unit.unitType === UnitType.FUNCTIONAL &&
    unit.particleRole === "benefactive_agent_subject" &&
    caseParticleMarkerRelationForToken(unit.jpHead, -1, {
      acceptedSurfaces: ["に", "から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["functional_fallback"]
    }) !== null &&
    unit.allomorphKey === "이/가";
}
