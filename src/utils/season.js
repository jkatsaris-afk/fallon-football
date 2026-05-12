import { supabase } from "../supabase";

export async function getActiveSeason() {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  let season = null;

  if (settings?.current_season_uuid) {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("id", settings.current_season_uuid)
      .maybeSingle();
    season = data || null;
  }

  if (!season && settings?.current_season) {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("year", settings.current_season)
      .maybeSingle();
    season = data || null;
  }

  return {
    settings: settings || {},
    season,
    seasonId: season?.id || settings?.current_season_uuid || null,
    seasonYear: season?.year || settings?.current_season || null,
    seasonLabel: season?.year || settings?.current_season || season?.name || "Current",
  };
}

export function seasonOr(active, uuidColumn = "season_uuid", yearColumn = "season_id") {
  const filters = [];
  if (active?.seasonId) filters.push(`${uuidColumn}.eq.${active.seasonId}`);
  if (active?.seasonYear) filters.push(`${yearColumn}.eq.${active.seasonYear}`);
  return filters.join(",");
}

export function applyPersonSeasonFilter(query, active) {
  const filter = seasonOr(active);
  return filter ? query.or(filter) : query;
}

export function applyUuidSeasonFilter(query, active, column = "season_id") {
  return active?.seasonId ? query.eq(column, active.seasonId) : query;
}

export function withSeasonPayload(payload, active, { uuidColumn = "season_uuid", yearColumn = "season_id" } = {}) {
  return {
    ...payload,
    ...(active?.seasonYear ? { [yearColumn]: active.seasonYear } : {}),
    ...(active?.seasonId ? { [uuidColumn]: active.seasonId } : {}),
  };
}
