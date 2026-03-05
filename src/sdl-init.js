import defaultSdl from '@kmamal/sdl';

let sdl = defaultSdl;

export function setSdl(externalSdl) {
    sdl = externalSdl;
}

export function getSdl() {
    return sdl;
}

export default sdl;
