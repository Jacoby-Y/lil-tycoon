
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /** @type {CanvasRenderingContext2D}*/
    let ctx;
    const set_ctx = (_ctx)=>{ 
    	ctx = _ctx; 
    };
    const circle = (x,y, r, color, fill=true, l_width=1)=>{
    	if (ctx == undefined) return;
    	if (fill) ctx.fillStyle = color;
    	else { ctx.strokeStyle = color; ctx.lineWidth = l_width; }
    	ctx.beginPath();
    	ctx.arc(x,y, r, 0, Math.PI*2);
    	if (fill) ctx.fill();
    	else ctx.stroke();
    };
    const rect = (x,y, w,h, color, fill=true, l_width=1)=>{
    	if (ctx == undefined) return;
    	if (fill) ctx.fillStyle = color;
    	else { ctx.strokeStyle = color; ctx.lineWidth = l_width; }
    	if (fill) ctx.fillRect(x,y, w,h);
    	else ctx.strokeRect(x,y, w,h);
    };
    const new_path = (...pts)=>{
    	let build = [];
    	for (let i = 0; i < pts.length; i += 2) {
    		const pt1 = pts[i];
    		const pt2 = pts[i+1];
    		build.push({
    			x: pt1,
    			y: pt2,
    		});
    	}
    	return build;
    };
    const path = (points=[], color="black", fill=true, l_width=1)=>{
    	if (fill) ctx.fillStyle = color;
    	else { ctx.strokeStyle = color; ctx.lineWidth = l_width; }
    	ctx.beginPath();
    	ctx.moveTo(points[0].x, points[1].y);
    	for (let i = 0; i < points.length; i++) {
    		const pt = points[i];
    		ctx.lineTo(pt.x, pt.y);
    	}
    	ctx.closePath();
    	if (fill) ctx.fill();
    	else ctx.stroke();
    };
    const transform = (x=0,y=0, ang=0)=>{
    	ctx.translate(x,y);
    	ctx.rotate(ang);
    };
    const reset = ()=>{
    	ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    var draw = {
    	set_ctx,
    	circle,
    	rect,
    	new_path,
    	path,
    	transform,
    	reset
    };

    /** @type {HTMLCanvasElement}*/
    const canvas = writable(null);
    let w = 0, h = 0;
    canvas.subscribe((v)=>{
    	if (v != null) {
    		w = v.width;
    		h = v.height;
    	}
    });

    const timer = writable(0);
    setInterval(() => { 
    	timer.update((v)=>(v+1)%30); 
    	job_m.update();
    }, 1000/30);

    const job_m = {
    	jobs: [],
    	add(func, ticks) {
    		this.jobs.push({ func, ticks });
    	},
    	update() {
    		for (let i = this.jobs.length-1; i >= 0; i--) {
    			const job = this.jobs[i];
    			job.ticks--;
    			if (job.ticks <= 0) {
    				job.func();
    				this.jobs.splice(i, 1);
    			}
    		}
    	}
    };

    const mouse = {
    	x: -1, y: -1,
    	hover: false,
    	down: false,
    };

    const player = {
    	x: 50, y: 50, size: 30,
    	update() {
    		const [ pw, ph ] = [ this.size, this.size ];
    		
    		this.x += contr.x*7;
    		this.y += contr.y*7;
    		if (this.x < 0) this.x = 0;
    		if (this.y < 0) this.y = 0;
    		if (this.x+pw > w) this.x = w-pw;
    		if (this.y+ph > h) this.y = h-ph;
    	},
    	draw() { draw.rect(this.x, this.y, this.size, this.size, "white"); }
    };
    const contr = {
    	a: false, d: false,
    	w: false, s: false,
    	e: false,
    	get x() {
    		const horz = (this.a ? -1 : 0) + (this.d ? 1 : 0);
    		const vert = (this.w ? -1 : 0) + (this.s ? 1 : 0);
    		if (horz != 0 && vert != 0)
    			return 0.707 * horz;
    		return horz;
    	},
    	get y() {
    		const horz = (this.a ? -1 : 0) + (this.d ? 1 : 0);
    		const vert = (this.w ? -1 : 0) + (this.s ? 1 : 0);
    		if (horz != 0 && vert != 0)
    			return 0.707 * vert;
    		return vert;
    	}
    };

    const cash = writable(0);

    const entity_m = (()=>{
    	const list = [];

    	return {
    		new(ent) {
    			list.push(ent);
    		},
    		get last() { return list.at(-1); },
    		update() {
    			for (let i = 0; i < list.length; i++) {
    				const ent = list[i];
    				for (const k in ent) {
    					if (!Object.hasOwnProperty.call(ent, k) || Systems[k] == undefined) continue;
    					const v = ent[k];
    					Systems[k](v, ent);
    				}
    			}
    		},
    	}
    })();

    class Entity {
    	constructor(options={ tag: "none", id: "none" }) {
    		this.tag = options.tag ?? "none";
    		this.id = options.id ?? "none";
    		entity_m.new(this);
    	}
    	set components(list) {
    		for (let i = 0; i < list.length; i++) {
    			const comp = list[i]?.constructor?.name;
    			if (comp == undefined) continue;
    			this[comp] = list[i];
    		}
    	}
    }

    const check_overlap = (x1, y1, w1, h1, x2, y2, w2, h2)=>{
    	return (
    		x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + h1 >= y2 && y1 <= y2 + h2
    	);
    };
    const Components = {
    	Position: class Position {
    		constructor(x,y) {
    			this.x = x;
    			this.y = y;
    		}
    	},
    	Graphic: class Graphic {
    		constructor(draw_fn=()=>{}) {
    			this.draw = draw_fn;
    		}
    	},
    	Collider: class Collider {
    		constructor(w, h) {
    			this.w = w;
    			this.h = h;
    		}
    	},
    	Trigger: class Trigger {
    		constructor(w=10, h=10, color={ on: "#ff6b0099", off: "#ff000099" }) {
    			this.w = w;
    			this.h = h;
    			this.color = color;
    		}
    	}
    };
    const Systems = {
    	Position(pos, ent) { },
    	Graphic(gr, ent) {
    		if (ent.Position != undefined) draw.transform(ent.Position.x, ent.Position.y);
    		gr.draw(ent);
    		draw.reset();
    	},
    	Collider(col, ent) {
    		const { x, y, w, h, on_hit } = col;
    		const { color, fill } = col;
    		const [ pw, ph ] = [ player.size, player.size ];
    		if (check_overlap(x,y,w,h, player.x,player.y,pw,ph)) {
    			if (!col.hit) {
    				on_hit(col);
    				col.hit = true;
    			}
    			const to_left = player.x+pw - x;
    			const to_right = x+w - player.x;
    			const to_top = player.y+ph - y;
    			const to_bottom = y+h - player.y;
    			const closest = Math.min(to_left, to_right, to_top, to_bottom);

    			if (closest == to_top) player.y = y-player.size;
    			if (closest == to_bottom) player.y = y+h;
    			if (closest == to_left) player.x = x-player.size;
    			if (closest == to_right) player.x = x+w;
    		} else if (col.hit) col.hit = false;
    		draw.rect(x, y, w, h, color, fill);
    	},
    	Trigger(trig, ent) {
    		if (ent.Position == undefined) throw `Entities with Triggers need positions!\nId: ${ent.id}, Tag: ${ent.tag}`
    		const { x, y } = ent.Position;
    		const { w, h } = trig;
    		const color = check_overlap(x,y, w,h, player.x, player.y, player.size, player.size) ? trig.color.on : trig.color.off;
    		draw.rect(x,y, w, h, color);
    	},
    };

    var entities = [{id:"test_trigger",Position:[100,100],Trigger:[50,50]},{id:"dropper_1",Position:[860,215],Collider:[75,40]}];

    /* src/main/Game.svelte generated by Svelte v3.47.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src/main/Game.svelte";

    function create_fragment$1(ctx) {
    	let main_1;
    	let canvas_1;
    	let t0;
    	let h3;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			main_1 = element("main");
    			canvas_1 = element("canvas");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text("Cash: ");
    			t2 = text(/*$cash*/ ctx[2]);
    			attr_dev(canvas_1, "class", "svelte-1f585e7");
    			add_location(canvas_1, file$1, 113, 1, 3007);
    			attr_dev(h3, "id", "cash");
    			attr_dev(h3, "class", "svelte-1f585e7");
    			add_location(h3, file$1, 114, 1, 3046);
    			attr_dev(main_1, "class", "svelte-1f585e7");
    			add_location(main_1, file$1, 111, 0, 2933);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main_1, anchor);
    			append_dev(main_1, canvas_1);
    			/*canvas_1_binding*/ ctx[3](canvas_1);
    			append_dev(main_1, t0);
    			append_dev(main_1, h3);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			/*main_1_binding*/ ctx[4](main_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$cash*/ 4) set_data_dev(t2, /*$cash*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main_1);
    			/*canvas_1_binding*/ ctx[3](null);
    			/*main_1_binding*/ ctx[4](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const background_color = "#3d6b32";

    function instance$1($$self, $$props, $$invalidate) {
    	let $canvas;
    	let $cash;
    	validate_store(canvas, 'canvas');
    	component_subscribe($$self, canvas, $$value => $$invalidate(1, $canvas = $$value));
    	validate_store(cash, 'cash');
    	component_subscribe($$self, cash, $$value => $$invalidate(2, $cash = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Game', slots, []);
    	let main;

    	/** @type {CanvasRenderingContext2D}*/
    	let ctx;

    	/** Causes main_loop to not run if true */
    	let pause = false;

    	/** If paused is true: then it runs main_loop once and goes back to being paused */
    	let step = false;

    	/** Width and height of canvas */
    	let w, h;

    	//#endregion
    	//#region | Main Stuff
    	const main_loop = v => {
    		if (!step && pause) return;
    		if (step) step = false;
    		ctx.fillStyle = background_color;
    		ctx.fillRect(0, 0, w, h);

    		// triggers.update();
    		try {
    			player.update();
    			entity_m.update();
    			player.draw();
    		} catch(error) {
    			console.log(error);
    			pause = true;
    		}
    	};

    	onMount(() => {
    		ctx = $canvas.getContext("2d");
    		draw.set_ctx(ctx);

    		timer.subscribe(v => {
    			main_loop();
    			main_loop();
    		});

    		set_store_value(canvas, $canvas.width = main.clientWidth, $canvas);
    		set_store_value(canvas, $canvas.height = main.clientHeight, $canvas);
    		[w, h] = [$canvas.width, $canvas.height];

    		set_store_value(
    			canvas,
    			$canvas.onmouseleave = () => {
    				mouse.hover = false;
    			},
    			$canvas
    		);

    		set_store_value(
    			canvas,
    			$canvas.onmousemove = e => {
    				[mouse.x, mouse.y] = [e.layerX, e.layerY];
    			},
    			$canvas
    		);

    		set_store_value(
    			canvas,
    			$canvas.onmousedown = e => {
    				[e.layerX, e.layerY];
    				mouse.down = true;
    			},
    			$canvas
    		);

    		set_store_value(
    			canvas,
    			$canvas.onmouseup = e => {
    				mouse.down = false;
    			},
    			$canvas
    		);
    	});

    	//#endregion
    	// new Entity().components = [
    	// 	new comps.Position(10, 10),
    	// 	new comps.Graphic(()=> draw.circle(0,0, 5, "red")),
    	// ];
    	for (let i = 0; i < entities.length; i++) {
    		const obj = entities[i];

    		// const ent = new Entity({ tag: obj.tag, id: obj.id });
    		let components = [];

    		let tag_id = {};

    		for (const k in obj) {
    			if (!Object.hasOwnProperty.call(obj, k)) continue;
    			const v = obj[k];
    			if (k == "tag") tag_id.tag = v;
    			if (k == "id") tag_id.id = v;
    			if (Components[k] == undefined || !Array.isArray(v)) continue;
    			components.push(new Components[k](...v));
    		}

    		const new_ent = new Entity(tag_id);
    		new_ent.components = components;
    	}

    	//#region | Key Events
    	document.onkeydown = ({ key }) => {
    		if (key == "a" && !contr.a) contr.a = true;
    		if (key == "d" && !contr.d) contr.d = true;
    		if (key == "w" && !contr.w) contr.w = true;
    		if (key == "s" && !contr.s) contr.s = true;
    		if (key == "e" && !contr.e) (contr.e = true, triggers.press_e());
    	};

    	document.onkeyup = ({ key }) => {
    		if (key == "a") contr.a = false;
    		if (key == "d") contr.d = false;
    		if (key == "w") contr.w = false;
    		if (key == "s") contr.s = false;
    		if (key == "e") contr.e = false;
    	};

    	window.onblur = () => {
    		contr.a = contr.d = contr.w = contr.s = false;
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Game> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$canvas = $$value;
    			canvas.set($canvas);
    		});
    	}

    	function main_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			main = $$value;
    			$$invalidate(0, main);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		timer,
    		job_m,
    		mouse,
    		player,
    		contr,
    		canvas,
    		cash,
    		draw,
    		entity_m,
    		Entity,
    		comps: Components,
    		entities,
    		main,
    		ctx,
    		pause,
    		step,
    		background_color,
    		w,
    		h,
    		main_loop,
    		$canvas,
    		$cash
    	});

    	$$self.$inject_state = $$props => {
    		if ('main' in $$props) $$invalidate(0, main = $$props.main);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('pause' in $$props) pause = $$props.pause;
    		if ('step' in $$props) step = $$props.step;
    		if ('w' in $$props) w = $$props.w;
    		if ('h' in $$props) h = $$props.h;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [main, $canvas, $cash, canvas_1_binding, main_1_binding];
    }

    class Game extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Game",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.47.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main_1;
    	let game;
    	let current;
    	game = new Game({ $$inline: true });

    	const block = {
    		c: function create() {
    			main_1 = element("main");
    			create_component(game.$$.fragment);
    			attr_dev(main_1, "class", "svelte-1goyswl");
    			add_location(main_1, file, 19, 0, 417);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main_1, anchor);
    			mount_component(game, main_1, null);
    			/*main_1_binding*/ ctx[1](main_1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(game.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(game.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main_1);
    			destroy_component(game);
    			/*main_1_binding*/ ctx[1](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let main;

    	window.onresize = () => {
    		let scale = 1;
    		const w = document.body.clientWidth;
    		const h = document.body.clientHeight;
    		if (w * 0.6 >= h) scale = h / 600; else scale = w / 1000;
    		$$invalidate(0, main.style.transform = `translate(-50%, -50%) scale(${scale - 0.02}, ${scale - 0.02})`, main);
    	};

    	onMount(() => {
    		window.onresize();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function main_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			main = $$value;
    			$$invalidate(0, main);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, Game, main });

    	$$self.$inject_state = $$props => {
    		if ('main' in $$props) $$invalidate(0, main = $$props.main);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [main, main_1_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: { }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
