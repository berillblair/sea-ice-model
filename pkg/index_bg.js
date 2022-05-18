import * as wasm from './index_bg.wasm';

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}
/**
* @param {number} width
* @param {number} height
*/
export function make_game(width, height) {
    wasm.make_game(width, height);
}

/**
*/
export function tick_game() {
    wasm.tick_game();
}

/**
* @returns {any}
*/
export function get_ship_states() {
    var ret = wasm.get_ship_states();
    return takeObject(ret);
}

/**
* @returns {any}
*/
export function get_routes() {
    var ret = wasm.get_routes();
    return takeObject(ret);
}

/**
* @param {number} x
* @param {number} y
* @param {number} quality_threshold
* @param {boolean} early_adopter
* @param {string} adoption_status
* @param {number} utility_threshold
* @param {number} experience_level
* @param {number} certainty
* @param {number} reliance_on_product
* @param {number} normative_influence
* @param {number} provider_trust
* @param {number} offset_x
* @param {number} offset_y
* @param {number} trial_year
* @returns {number}
*/
export function add_ship(x, y, quality_threshold, early_adopter, adoption_status, utility_threshold, experience_level, certainty, reliance_on_product, normative_influence, provider_trust, offset_x, offset_y, trial_year) {
    var ptr0 = passStringToWasm0(adoption_status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.add_ship(x, y, quality_threshold, early_adopter, ptr0, len0, utility_threshold, experience_level, certainty, reliance_on_product, normative_influence, provider_trust, offset_x, offset_y, trial_year);
    return ret >>> 0;
}

/**
*/
export function clear_ships() {
    wasm.clear_ships();
}

/**
* @param {number} ship
* @param {any} task_js
*/
export function add_ship_task(ship, task_js) {
    wasm.add_ship_task(ship, addHeapObject(task_js));
}

/**
* @param {number} ship
* @param {boolean} adopter
*/
export function set_early_adopter(ship, adopter) {
    wasm.set_early_adopter(ship, adopter);
}

/**
* @param {number} year
*/
export function update_year(year) {
    wasm.update_year(year);
}

/**
* @param {number} ship
* @param {string} status
*/
export function update_ship_adoption_status(ship, status) {
    var ptr0 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.update_ship_adoption_status(ship, ptr0, len0);
}

/**
* @param {number} ship
* @param {number} year
*/
export function update_ship_trial_year(ship, year) {
    wasm.update_ship_trial_year(ship, year);
}

/**
* @param {number} ship
* @param {number} certainty
*/
export function update_ship_certainty(ship, certainty) {
    wasm.update_ship_certainty(ship, certainty);
}

/**
* @param {number} ship
* @param {number} reliance_on_informational_environment
*/
export function update_reliance_on_informational_environment(ship, reliance_on_informational_environment) {
    wasm.update_reliance_on_informational_environment(ship, reliance_on_informational_environment);
}

/**
* @param {number} ship
* @param {number} utility_threshold
*/
export function update_ship_utility_threshold(ship, utility_threshold) {
    wasm.update_ship_utility_threshold(ship, utility_threshold);
}

/**
* @param {number} ship
* @param {number} experience_level
*/
export function update_ship_experience_level(ship, experience_level) {
    wasm.update_ship_experience_level(ship, experience_level);
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint8Array} grid
*/
export function upload_grid(grid) {
    var ptr0 = passArray8ToWasm0(grid, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.upload_grid(ptr0, len0);
}

export function __wbindgen_json_parse(arg0, arg1) {
    var ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbindgen_json_serialize(arg0, arg1) {
    const obj = getObject(arg1);
    var ret = JSON.stringify(obj === undefined ? null : obj);
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbg_new_59cb74e423758ede() {
    var ret = new Error();
    return addHeapObject(ret);
};

export function __wbg_stack_558ba5917b466edd(arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_error_4bb6c2a97407129a(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

