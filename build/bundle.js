
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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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

    const cash = writable(0);

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

    /* src/main/Game.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/main/Game.svelte";

    function create_fragment$1(ctx) {
    	let main_1;
    	let canvas_1;
    	let t0;
    	let h3;
    	let t1;
    	let t2;
    	let t3;
    	let div;

    	const block = {
    		c: function create() {
    			main_1 = element("main");
    			canvas_1 = element("canvas");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text("Cash: ");
    			t2 = text(/*$cash*/ ctx[4]);
    			t3 = space();
    			div = element("div");
    			attr_dev(canvas_1, "class", "svelte-1f585e7");
    			add_location(canvas_1, file$1, 345, 1, 9463);
    			attr_dev(h3, "id", "cash");
    			attr_dev(h3, "class", "svelte-1f585e7");
    			add_location(h3, file$1, 346, 1, 9501);
    			attr_dev(div, "id", "trigger-info");
    			set_style(div, "display", /*on_trigger*/ ctx[2] ? "block" : "none");
    			attr_dev(div, "class", "svelte-1f585e7");
    			add_location(div, file$1, 347, 1, 9535);
    			attr_dev(main_1, "class", "svelte-1f585e7");
    			add_location(main_1, file$1, 344, 0, 9438);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main_1, anchor);
    			append_dev(main_1, canvas_1);
    			/*canvas_1_binding*/ ctx[5](canvas_1);
    			append_dev(main_1, t0);
    			append_dev(main_1, h3);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			append_dev(main_1, t3);
    			append_dev(main_1, div);
    			/*div_binding*/ ctx[6](div);
    			/*main_1_binding*/ ctx[7](main_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$cash*/ 16) set_data_dev(t2, /*$cash*/ ctx[4]);

    			if (dirty & /*on_trigger*/ 4) {
    				set_style(div, "display", /*on_trigger*/ ctx[2] ? "block" : "none");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main_1);
    			/*canvas_1_binding*/ ctx[5](null);
    			/*div_binding*/ ctx[6](null);
    			/*main_1_binding*/ ctx[7](null);
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
    	let $cash;
    	validate_store(cash, 'cash');
    	component_subscribe($$self, cash, $$value => $$invalidate(4, $cash = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Game', slots, []);
    	let main;

    	/** @type {HTMLCanvasElement}*/
    	let canvas;

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
    		ctx.fillStyle = background_color;
    		ctx.fillRect(0, 0, w, h);

    		// triggers.update();
    		player.update();

    		entities.update();
    		player.draw();
    	};

    	onMount(() => {
    		ctx = canvas.getContext("2d");
    		draw.set_ctx(ctx);

    		timer.subscribe(v => {
    			main_loop();
    		});

    		$$invalidate(1, canvas.width = main.clientWidth, canvas);
    		$$invalidate(1, canvas.height = main.clientHeight, canvas);
    		[w, h] = [canvas.width, canvas.height];

    		$$invalidate(
    			1,
    			canvas.onmouseleave = () => {
    				mouse.hover = false;
    			},
    			canvas
    		);

    		$$invalidate(
    			1,
    			canvas.onmousemove = e => {
    				[mouse.x, mouse.y] = [e.layerX, e.layerY];
    			},
    			canvas
    		);

    		$$invalidate(
    			1,
    			canvas.onmousedown = e => {
    				[e.layerX, e.layerY];
    				mouse.down = true;
    			},
    			canvas
    		);

    		$$invalidate(
    			1,
    			canvas.onmouseup = e => {
    				mouse.down = false;
    			},
    			canvas
    		);
    	});

    	const check_overlap = (x1, y1, w1, h1, x2, y2, w2, h2) => {
    		return x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + h1 >= y2 && y1 <= y2 + h2;
    	};

    	const player = {
    		x: 50,
    		y: 50,
    		size: 30,
    		update() {
    			const [pw, ph] = [this.size, this.size];
    			this.x += contr.x * 7;
    			this.y += contr.y * 7;
    			if (this.x < 0) this.x = 0;
    			if (this.y < 0) this.y = 0;
    			if (this.x + pw > w) this.x = w - pw;
    			if (this.y + ph > h) (this.y = h - ph, console.log(`py: ${this.y}, h: ${h}`));
    		},
    		draw() {
    			draw.rect(this.x, this.y, this.size, this.size, "white");
    		}
    	};

    	//#endregion
    	//#region | Entities
    	const entities = {
    		list: [],
    		funcs: {},
    		add(data) {
    			this.list.push(data);
    		},
    		get_all(tag = "tag") {
    			const query = [];

    			for (let i = 0; i < this.list.length; i++) {
    				const ent = this.list[i];
    				if (ent.tag == tag) query.push(ent);
    			}

    			return query;
    		},
    		gid(id) {
    			for (let i = 0; i < this.list.length; i++) {
    				const ent = this.list[i];
    				if (ent.id == id) return ent;
    			}

    			return null;
    		},
    		bind(tag = "tag", func = (ent = {}) => {
    			
    		}) {
    			this.funcs[tag] = func;
    		},
    		update() {
    			const to_dest = [];

    			for (let i = 0; i < this.list.length; i++) {
    				const ent = this.list[i];

    				if (ent.destroy === true) {
    					to_dest.push(i);
    					continue;
    				}

    				if (ent.enabled === false) continue;
    				if (typeof this.funcs[ent.tag] == "function") this.funcs[ent.tag](ent);
    			}

    			if (to_dest.length <= 0) return;
    			to_dest.reverse();

    			for (let j = 0; j < to_dest.length; j++) {
    				const i = to_dest[j];
    				this.list.splice(i, 1);
    			}
    		},
    		update_order(...tags) {
    			const build = [];

    			for (let i = 0; i < tags.length; i++) {
    				const tag = tags[i];
    				build = build.concat(this.get_all(tag));
    			}

    			this.list = build;
    		}
    	};

    	entities.bind("collider", col => {
    		const { x, y, w, h, on_hit } = col;
    		const { color, fill } = col;
    		const [pw, ph] = [player.size, player.size];

    		if (check_overlap(x, y, w, h, player.x, player.y, pw, ph)) {
    			if (!col.hit) {
    				on_hit(col);
    				col.hit = true;
    			}

    			const to_left = player.x + pw - x;
    			const to_right = x + w - player.x;
    			const to_top = player.y + ph - y;
    			const to_bottom = y + h - player.y;
    			const closest = Math.min(to_left, to_right, to_top, to_bottom);

    			if (closest == to_top) {
    				player.y = y - player.size;
    			}

    			if (closest == to_bottom) {
    				player.y = y + h;
    			}

    			if (closest == to_left) {
    				player.x = x - player.size;
    			}

    			if (closest == to_right) {
    				player.x = x + w;
    			}
    		} else if (col.hit) col.hit = false;

    		draw.rect(x, y, w, h, color, fill);
    	});

    	entities.bind("trigger", trig => {
    		const { x, y, w, h, enter, leave } = trig;
    		const { color, enter_color, fill, width } = trig.style;

    		if (check_overlap(x, y, w, h, player.x, player.y, player.size, player.size)) {
    			if (!trig.entered) {
    				enter(trig);
    				trig.entered = true;
    				if (typeof trig.trigger_info == "string") set_trigger_info(trig, trig.trigger_info);
    			}

    			// on_trigger = true;
    			draw.rect(x, y, w, h, enter_color, fill, width);
    		} else {
    			if (trig.entered) {
    				leave(trig);
    				trig.entered = false;
    				if (typeof trig.trigger_info == "string") $$invalidate(2, on_trigger = false);
    			}

    			draw.rect(x, y, w, h, color, fill, width);
    		}
    	});

    	entities.bind("orbs", orbs => {
    		const { list } = orbs;

    		for (let i = 0; i < list.length; i++) {
    			const orb = list[list.length - i - 1];
    			draw.circle(orb.x, orb.y, 5, "aqua");

    			if (orb.x < 920) orb.x++; else if (orb.y < 510) orb.y++; else {
    				orb.collect = true;
    				set_store_value(cash, $cash++, $cash);
    			}
    		}

    		// orbs.list = orbs.list.filter( orb => orb.collect == false );
    		for (let i = list.length - 1; i >= 0; i--) {
    			const orb = list[i];

    			if (orb.collect === true) {
    				orbs.list.splice(i, 1);
    			}
    		}

    		if (orbs.ticks <= 0) {
    			list.push({ x: 920, y: 55, collect: false });
    			orbs.ticks = 60;
    		} // console.log(list);

    		orbs.ticks--;
    	});

    	//#endregion
    	//#region | Triggers
    	let on_trigger = false;

    	/** @type HTMLElement */
    	let trigger_info;

    	const set_trigger_info = (trig, text) => {
    		$$invalidate(2, on_trigger = true);
    		$$invalidate(3, trigger_info.style.left = trig.x + trig.w / 2 + "px", trigger_info);
    		$$invalidate(3, trigger_info.style.top = trig.y + trig.h + 10 + "px", trigger_info);
    		$$invalidate(3, trigger_info.innerText = text, trigger_info);
    	}; // trigger_info.style.display = "block";

    	const triggers = {
    		list: [],
    		add(x = 10, y = 10, w = 10, h = 10, callbacks = {
    			enter: () => {
    				
    			},
    			leave: () => {
    				
    			},
    			activate: () => {
    				
    			}
    		}, style = {
    			color: "#ff000066",
    			enter_color: "#ff000066",
    			fill: true,
    			width: 1
    		}) {
    			entities.add({
    				tag: "trigger",
    				x,
    				y,
    				w,
    				h,
    				enter: callbacks.enter ?? (() => {
    					
    				}),
    				leave: callbacks.leave ?? (() => {
    					
    				}),
    				activate: callbacks.activate ?? (() => {
    					
    				}),
    				entered: false,
    				style: {
    					color: style.color ?? "#ff000066",
    					enter_color: style.enter_color ?? "#ff000066",
    					fill: style.fill ?? true,
    					width: style.width ?? 1
    				}
    			});
    		},
    		press_e() {
    			for (const trig of entities.get_all("trigger")) {
    				if (trig.entered) trig.activate(trig);
    				if (trig.destroy == true || trig.enabled == false) $$invalidate(2, on_trigger = false);
    			}
    		}
    	};

    	triggers.add(
    		100,
    		100,
    		50,
    		50,
    		{
    			activate(t) {
    				t.destroy = true;
    			}
    		},
    		{ color: "#ff000099" }
    	);

    	entities.list.at(-1).id = "test_trigger";
    	entities.list.at(-1).trigger_info = "Testing Testing 123";

    	triggers.add(800, 40, 30, 30, {}, {
    		color: "#ff000099",
    		enter_color: "#ff6b0099"
    	});

    	entities.list.at(-1).id = "drop_trigger_1";
    	entities.list.at(-1).trigger_info = "Dropper 1";

    	triggers.add(
    		800,
    		140,
    		30,
    		30,
    		{
    			activate(t) {
    				entities.gid("dropper_2").enabled = entities.gid("drop_trigger_2").enabled = t.destroy = true;
    			}
    		},
    		{
    			color: "#ff000099",
    			enter_color: "#ff6b0099"
    		}
    	);

    	entities.list.at(-1).id = "unlock_drop_trigger_2";
    	entities.list.at(-1).trigger_info = "Unlock Dropper 2";

    	triggers.add(800, 140, 30, 30, {}, {
    		color: "#ff000099",
    		enter_color: "#ff6b0099"
    	});

    	entities.list.at(-1).id = "drop_trigger_2";
    	entities.list.at(-1).trigger_info = "Dropper 2";
    	entities.list.at(-1).enabled = false;

    	//#endregion
    	//#region | Colliders
    	const colliders = {
    		list: [],
    		add(x = 10, y = 10, w = 10, h = 10, on_hit = col => {
    			
    		}, extra = { color: "#0000ff55", fill: true, width: 1 }) {
    			entities.add({
    				tag: "collider",
    				x,
    				y,
    				w,
    				h,
    				on_hit,
    				hit: false,
    				color: extra.color ?? "#00000000",
    				fill: extra.fill ?? true,
    				width: extra.width ?? 1
    			});
    		}
    	};

    	colliders.add(
    		860,
    		510,
    		120,
    		70,
    		() => {
    			
    		},
    		{ color: "#222" }
    	);

    	entities.list.at(-1).id = "collector_block";

    	colliders.add(
    		895,
    		510,
    		50,
    		10,
    		() => {
    			
    		},
    		{ color: "#444" }
    	);

    	entities.list.at(-1).id = "collector_block_door";

    	colliders.add(
    		895,
    		20,
    		50,
    		490,
    		() => {
    			
    		},
    		{ color: "#555" }
    	);

    	entities.list.at(-1).id = "conveyor_1";
    	entities.add({ tag: "orbs", list: [], ticks: 0 });

    	colliders.add(
    		835,
    		40,
    		100,
    		30,
    		() => {
    			
    		},
    		{ color: "#444" }
    	);

    	entities.list.at(-1).id = "dropper_1";

    	colliders.add(
    		835,
    		140,
    		100,
    		30,
    		() => {
    			
    		},
    		{ color: "#444" }
    	);

    	entities.list.at(-1).id = "dropper_2";
    	entities.list.at(-1).enabled = false;

    	//#endregion
    	//#region | Controller / Key Events
    	const contr = {
    		a: false,
    		d: false,
    		w: false,
    		s: false,
    		e: false,
    		get x() {
    			const horz = (this.a ? -1 : 0) + (this.d ? 1 : 0);
    			const vert = (this.w ? -1 : 0) + (this.s ? 1 : 0);
    			if (horz != 0 && vert != 0) return 0.707 * horz;
    			return horz;
    		},
    		get y() {
    			const horz = (this.a ? -1 : 0) + (this.d ? 1 : 0);
    			const vert = (this.w ? -1 : 0) + (this.s ? 1 : 0);
    			if (horz != 0 && vert != 0) return 0.707 * vert;
    			return vert;
    		}
    	};

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

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Game> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(1, canvas);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			trigger_info = $$value;
    			$$invalidate(3, trigger_info);
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
    		cash,
    		draw,
    		main,
    		canvas,
    		ctx,
    		pause,
    		step,
    		background_color,
    		w,
    		h,
    		main_loop,
    		check_overlap,
    		player,
    		entities,
    		on_trigger,
    		trigger_info,
    		set_trigger_info,
    		triggers,
    		colliders,
    		contr,
    		$cash
    	});

    	$$self.$inject_state = $$props => {
    		if ('main' in $$props) $$invalidate(0, main = $$props.main);
    		if ('canvas' in $$props) $$invalidate(1, canvas = $$props.canvas);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('pause' in $$props) pause = $$props.pause;
    		if ('step' in $$props) step = $$props.step;
    		if ('w' in $$props) w = $$props.w;
    		if ('h' in $$props) h = $$props.h;
    		if ('on_trigger' in $$props) $$invalidate(2, on_trigger = $$props.on_trigger);
    		if ('trigger_info' in $$props) $$invalidate(3, trigger_info = $$props.trigger_info);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		main,
    		canvas,
    		on_trigger,
    		trigger_info,
    		$cash,
    		canvas_1_binding,
    		div_binding,
    		main_1_binding
    	];
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
