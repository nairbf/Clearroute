const MAPLIBRE_FALLBACK_STYLE = 'https://demotiles.maplibre.org/style.json';
const STADIA_BASE_URL = 'https://tiles.stadiamaps.com/styles';

type StadiaStyle = 'alidade_smooth' | 'osm_bright';

export function getMapStyle(style: StadiaStyle): string {
  const apiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY;

  if (!apiKey) {
    return MAPLIBRE_FALLBACK_STYLE;
  }

  const url = `${STADIA_BASE_URL}/${style}.json`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${apiKey}`;
}
