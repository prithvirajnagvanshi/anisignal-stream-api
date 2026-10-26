import {
  getAsync, setAsync, isFresh, needsRefresh,
  episodeTTL,
} from "./smartcache.js";
import { getEpisodes as anikotoEpisodes } from "../providers/anikoto.js";
import { getEpisodes as animeggEpisodes } from "../providers/animegg.js";
import { getEpisodes as aniwavesEpisodes } from "../providers/aniwaves.js";
const inflight  = new Map();
const bgRunning = new Set();

function dedupe(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function bg(key, fn) {
  if (bgRunning.has(key)) return;
  bgRunning.add(key);
  Promise.resolve()
    .then(fn)
    .catch(e => console.error(`[bg:${key}]`, e.message))
    .finally(() => bgRunning.delete(key));
}

async function withCache(key, status, fetchFn) {
  const [ttl, refreshAfter] = episodeTTL(status);
  const entry = await getAsync(key);

  if (isFresh(entry)) {
    if (needsRefresh(entry)) {
      bg(key, async () => {
        const data = await fetchFn();
        await setAsync(key, data, ttl, refreshAfter);
      });
    }
    return entry.data;
  }

  const data = await fetchFn();
  await setAsync(key, data, ttl, refreshAfter);
  return data;
}

function orderEpisodeFields(data) {
  if (!data?.episodes || typeof data.episodes !== "object") return data;
  const episodes = Object.fromEntries(Object.entries(data.episodes).map(([audio, list]) => [
    audio,
    Array.isArray(list)
      ? list.map(({ id, audio: itemAudio, sourceNumber, ...episode }) => ({
        ...(id === undefined ? {} : { id }),
        ...(sourceNumber === undefined ? {} : { sourceNumber }),
        ...(itemAudio === undefined ? {} : { audio: itemAudio }),
        ...episode,
      }))
      : list,
  ]));
  return { ...data, episodes };
}

async function safe(label, fn) {
  try   { return { ok: true,  data: orderEpisodeFields(await fn()) }; }
  catch (e) { console.error(`[ep:${label}]`, e.message); return { ok: false, error: e.message, stack: e.stack }; }
}

const PROVIDER_ALIASES = {
  anikoto: "anikoto",
  animegg: "animegg",
  aniwaves: "aniwaves",
};

export function resolveProviders(rawNames) {
  const resolved = new Set();
  const unknown  = [];
  for (const raw of rawNames) {
    const name = PROVIDER_ALIASES[raw.toLowerCase()];
    if (name) resolved.add(name);
    else unknown.push(raw);
  }
  return { resolved, unknown };
}

function providerFns(anilistId, status, ctx) {
  return {
    anikoto: () => withCache(`epv:anikoto:v2:${anilistId}`, status, () => anikotoEpisodes(anilistId, ctx)),
    animegg: () => withCache(`epv:animegg:${anilistId}`, status, () => animeggEpisodes(anilistId, ctx)),
    aniwaves: () => withCache(`epv:aniwaves:${anilistId}`, status, () => aniwavesEpisodes(anilistId, ctx)),
  };
}

export async function buildFilteredEpisodesWithCache(anilistId, providers, media, anizip) {
  const status = media?.status ?? "RELEASING";
  const ctx  = { media, anizip, maxPages: undefined };
  const fns  = providerFns(anilistId, status, ctx);

  const pairs = await Promise.all(
    [...providers].map(async (name) => {
      const result = await safe(name, fns[name]);
      return [name, result.ok ? result.data : { error: result.error, stack: result.stack }];
    })
  );

  return Object.fromEntries(pairs);
}

export async function buildEpisodesWithCache(anilistId, media, anizip) {
  const status = media?.status ?? "RELEASING";
  const ctx = { media, anizip, maxPages: undefined };

  const [anikoto, animegg, aniwaves] = await Promise.all([
    safe("anikoto", () => withCache(`epv:anikoto:v2:${anilistId}`, status, () => anikotoEpisodes(anilistId, ctx))),
    safe("animegg", () => withCache(`epv:animegg:${anilistId}`, status, () => animeggEpisodes(anilistId, ctx))),
    safe("aniwaves", () => withCache(`epv:aniwaves:${anilistId}`, status, () => aniwavesEpisodes(anilistId, ctx))),
  ]);

  return {
    anikoto: anikoto.ok ? anikoto.data : { error: anikoto.error, stack: anikoto.stack },
    animegg: animegg.ok ? animegg.data : { error: animegg.error, stack: animegg.stack },
    aniwaves: aniwaves.ok ? aniwaves.data : { error: aniwaves.error, stack: aniwaves.stack },
  };
}
