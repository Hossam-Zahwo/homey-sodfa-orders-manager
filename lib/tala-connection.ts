import type {Brand} from './types';

export const talaEndpoint = 'https://portal.talaxp.com:8443/graphql';
export const talaDocumentation = 'https://accuratess.github.io/lg-api/';
export const talaSupport = 'mahmoud@accuratess.com';

export type TalaOperation = 'services' | 'zones' | 'subzones' | 'tracking';
export type TalaOption = {id: number; name: string};
export type TalaTracking = {code: string; refNumber: string | null; status: {code: string; name: string} | null};

export function talaCredentialNames(brand: Brand) {
 const prefix = brand === 'homey' ? 'TALA_HOMEY' : 'TALA_SODFA';
 return {username: prefix + '_USERNAME', password: prefix + '_PASSWORD'};
}
