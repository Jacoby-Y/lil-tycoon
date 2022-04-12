<script>
	import { onMount } from "svelte";
	import { timer, job_m, mouse } from "../game.js";
	import { cash } from "../stores.js";
	import draw from "../utils/draw.js";
	

	//#region | Canvas
	/** <main> holding all html of the game */
	let main;
	/** @type {HTMLCanvasElement}*/
	let canvas;
	/** @type {CanvasRenderingContext2D}*/
	let ctx;
	/** Causes main_loop to not run if true */
	let pause = false;
	/** If paused is true: then it runs main_loop once and goes back to being paused */
	let step = false;
	/** Background color of the canvas */
	const background_color = "#3d6b32";
	/** Width and height of canvas */
	let w, h; 
	//#endregion
	
	//#region | Main Stuff
	const main_loop = (v)=>{
		ctx.fillStyle = background_color;
		ctx.fillRect(0, 0, w, h);

		// triggers.update();
		player.update();
		entities.update();
		player.draw();
	}
	onMount(()=>{
		ctx = canvas.getContext("2d");
		draw.set_ctx(ctx);
		timer.subscribe((v)=>{ main_loop(v); main_loop(v); });
		
		canvas.width = main.clientWidth;
		canvas.height = main.clientHeight;
		[w, h] = [canvas.width, canvas.height];

		canvas.onmouseleave = ()=>{
			mouse.hover = false;
		}
		canvas.onmousemove = (e)=>{
			[ mouse.x, mouse.y ] = [ e.layerX, e.layerY ];
		}
		canvas.onmousedown = (e)=>{
			const [ x, y ] = [ e.layerX, e.layerY ];
			mouse.down = true;
		}
		canvas.onmouseup = (e)=>{
			mouse.down = false;
		}
	});

	const check_overlap = (x1, y1, w1, h1, x2, y2, w2, h2)=>{
		return (
			x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + h1 >= y2 && y1 <= y2 + h2
		);
	}

	const player = {
		x: 50, y: 50, size: 30,
		update() {
			const [ pw, ph ] = [ this.size, this.size ];
			
			this.x += contr.x*7;
			this.y += contr.y*7;
			if (this.x < 0) this.x = 0;
			if (this.y < 0) this.y = 0;
			if (this.x+pw > w) this.x = w-pw;
			if (this.y+ph > h) (this.y = h-ph, console.log(`py: ${this.y}, h: ${h}`));
		},
		draw() { draw.rect(this.x, this.y, this.size, this.size, "white"); }
	}
	//#endregion

	//#region | Entities
	const entities = {
		list: [],
		funcs: {},
		add(data) {
			this.list.push(data);
		},
		get_all(tag="tag") {
			const query = [];
			for (let i = 0; i < this.list.length; i++) {
				const ent = this.list[i];
				if (ent.tag.includes(tag)) query.push(ent);
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
		bind(tag="tag", func=(ent={})=>{}) {
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
				if (ent.tag.length <= 0) return;
				for (let j = 0; j < ent.tag.split(" ").length; j++) {
					const tag = ent.tag.split(" ")[j];
					if (typeof this.funcs[tag] == "function") this.funcs[tag](ent);
				}
			}
			if (to_dest.length <= 0) return;
			to_dest.reverse()
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
		},
		apply(index, obj) {
			const ent = this.list.at(index);
			for (const k in obj) {
				if (!Object.hasOwnProperty.call(obj, k)) continue;
				const v = obj[k];
				ent[k] = v;
			}
			return ent;
		}
	}
	entities.bind("collider", (col)=>{
		const { x, y, w, h, on_hit } = col;
		const { color, fill } = col;
		const [ pw, ph ] = [ player.size, player.size ]
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

			if (closest == to_top) {
				player.y = y-player.size
			}
			if (closest == to_bottom) {
				player.y = y+h;
			}
			if (closest == to_left) {
				player.x = x-player.size;
			}
			if (closest == to_right) {
				player.x = x+w;
			}
		} else if (col.hit) col.hit = false;
		draw.rect(x, y, w, h, color, fill)
	});
	entities.bind("dropper", (drop)=>{
		const { x, y } = drop.drop_at;
		if (orbs.ticks <= 0) {
			orbs.list.push({
				x, y,
				collect: false,
				lvl: 0,
			});
			// console.log(orbs);
		}
	});
	entities.bind("trigger", (trig)=>{
		const { x, y, w, h, enter, leave } = trig;
		const { color, enter_color, fill, width } = trig.style;
		if (check_overlap(x,y,w,h, player.x, player.y, player.size, player.size)) {
			if (!trig.entered) {
				enter(trig);
				trig.entered = true;
				if (typeof trig.trigger_info == "string") set_trigger_info(trig, trig.trigger_info);
			}
			// on_trigger = true;
			draw.rect(x,y,w,h, enter_color, fill, width);
		}
		else {
			if (trig.entered) {
				leave(trig);
				trig.entered = false;
				if (typeof trig.trigger_info == "string") on_trigger = false;
			}
			draw.rect(x,y,w,h, color, fill, width);
		}
	});
	const orb_lvl_colors = [ "#fff", "#ff8282", "#ffb482", "#fcff82", "#a9ff82", "#82ffbb", "#82f3ff", "#82aaff", "#a782ff", "#ff82fc"]
	entities.bind("orbs", (orbs)=>{
		const { list } = orbs;

		for (let i = 0; i < list.length; i++) {
			const orb = list[list.length - i - 1];
			draw.circle(orb.x, orb.y, 5, orb_lvl_colors[orb.lvl]);
			if (orb.x < 920) orb.lvl += multiply("x", orb.x, ++orb.x);
			else if (orb.y < 510) orb.lvl += multiply("y", orb.y, ++orb.y);
			else {
				orb.collect = true;
				$cash += orb.lvl;
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
			// list.push({
			// 	x: 920,
			// 	y: 55,
			// 	collect: false,
			// });
			orbs.ticks = 60;
			// console.log(list);
		}
		orbs.ticks--;
	});
	const multiply = (xy, pos1, pos2)=>{
		const mults = entities.get_all("multiplier");
		for (const mult of mults) {
			if (mult.xy != xy || mult.enabled === false) continue;
			if (pos1 <= mult[xy]+mult.h/2 && pos2 > mult[xy]+mult.h/2) {
				return 1;
			}
		}
		return 0;
	}
	entities.bind("multiplier", (mult)=>{

	});
	//#endregion
	//#region | Triggers
	let on_trigger = false;
	/** @type HTMLElement */
	let trigger_info;
	const set_trigger_info = (trig, text)=>{
		on_trigger = true;
		trigger_info.style.left = trig.x+trig.w/2 + "px";
		trigger_info.style.top = trig.y+trig.h+10 + "px";
		trigger_info.innerText = text;
		// trigger_info.style.display = "block";
	}
	const triggers = {
		list: [],
		add(x=10,y=10, w=10,h=10, callbacks={enter:()=>{},leave:()=>{},activate:()=>{}},  style={ color: "#ff000066", enter_color: "#ff000066", fill: true, width: 1 }) {
			entities.add({ 
				tag: "trigger", x, y, w, h, 
				enter: callbacks.enter ?? (()=>{}), 
				leave: callbacks.leave ?? (()=>{}), 
				activate: callbacks.activate ?? (()=>{}),
				entered: false,
				style: {
					color: style.color ?? "#ff000066",
					enter_color: style.enter_color ?? "#ff000066",
					fill: style.fill ?? true,
					width: style.width ?? 1,
				}
			});
		},
		press_e() {
			for (const trig of entities.get_all("trigger")) {
				if (trig.entered) trig.activate(trig);
				if (trig.destroy == true || trig.enabled == false) on_trigger = false;
			}
		}
	};
	triggers.add(100, 100, 50, 50, { activate(t){ t.destroy = true; }, }, { color: "#ff000099" })
	void entities.apply(-1, { id: "test_trigger", trigger_info: "Testing Testing 123" });
	
	triggers.add(800, 40, 30, 30, {}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "drop_trigger_1", trigger_info: "Dropper 1" });
	
	triggers.add(800, 140, 30, 30, {activate(t) { entities.gid("dropper_2").enabled = entities.gid("drop_trigger_2").enabled = t.destroy = true }}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "unlock_drop_trigger_2", trigger_info: "Unlock Dropper 2" });

	triggers.add(800, 240, 30, 30, {activate(t) { entities.gid("dropper_3").enabled = entities.gid("drop_trigger_3").enabled = t.destroy = true }}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "unlock_drop_trigger_3", trigger_info: "Unlock Dropper 3" });
	
	triggers.add(800, 140, 30, 30, {}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "drop_trigger_2", trigger_info: "Dropper 2", enabled: false });

	triggers.add(800, 240, 30, 30, {}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "drop_trigger_3", trigger_info: "Dropper 3", enabled: false });

	triggers.add(800, 340, 30, 30, {activate(t) { entities.gid("mult_1").enabled = t.destroy = entities.gid("unlock_mult_trigger_2").enabled = true }}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "unlock_mult_trigger_1", trigger_info: "Unlock Multiplier 1" });
	
	triggers.add(800, 340, 30, 30, {activate(t) { entities.gid("mult_2").enabled = t.destroy = entities.gid("unlock_mult_trigger_3").enabled = true; }}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "unlock_mult_trigger_2", trigger_info: "Unlock Multiplier 2", enabled: false });

	triggers.add(800, 340, 30, 30, {activate(t) { entities.gid("mult_3").enabled = t.destroy = true; }}, { color: "#ff000099", enter_color: "#ff6b0099" });
	void entities.apply(-1, { id: "unlock_mult_trigger_3", trigger_info: "Unlock Multiplier 3", enabled: false });
	//#endregion
	//#region | Colliders
	const colliders = {
		list: [],
		add(x=10,y=10,w=10,h=10, on_hit=(col)=>{}, extra={ color: "#0000ff55", fill: true, width: 1 }) {
			entities.add({ 
				tag: "collider", 
				x, y, w, h, on_hit, hit: false,
				color: extra.color ?? "#00000000",
				fill: extra.fill ?? true,
				width: extra.width ?? 1,
			});
		}
	}
	colliders.add(860, 510, 120, 70, ()=>{}, { color: "#222" } );
	void entities.apply(-1, { id: "collector_block" });
	
	colliders.add(895, 510, 50, 10, ()=>{}, { color: "#444" } );
	void entities.apply(-1, { id: "collector_block_door" });
	
	colliders.add(895, 20, 50, 490, ()=>{}, { color: "#555" } );
	void entities.apply(-1, { id: "conveyor_1" });

	entities.add({
		tag: "orbs",
		list: [],
		ticks: 0,
	});
	const orbs = entities.list.at(-1);
	
	colliders.add(835, 40, 100, 30, ()=>{}, { color: "#444" } );
	void entities.apply(-1, { id: "dropper_1", tag: "collider dropper", drop_at: { x: 920, y: 55 } });
	
	colliders.add(835, 140, 100, 30, ()=>{}, { color: "#444" } );
	void entities.apply(-1, { id: "dropper_2", tag: "collider dropper", enabled: false, drop_at: { x: 920, y: 155 }  });

	colliders.add(835, 240, 100, 30, ()=>{}, { color: "#444" } );
	void entities.apply(-1, { id: "dropper_3", tag: "collider dropper", enabled: false, drop_at: { x: 920, y: 255 }  });
	
	colliders.add(890, 350, 60, 15, ()=>{}, { color: "#444" } ); void entities.apply(-1, { id: "mult_1", tag: "collider multiplier", xy: "y", enabled: false });
	colliders.add(890, 400, 60, 15, ()=>{}, { color: "#444" } ); void entities.apply(-1, { id: "mult_2", tag: "collider multiplier", xy: "y", enabled: false });
	colliders.add(890, 450, 60, 15, ()=>{}, { color: "#444" } ); void entities.apply(-1, { id: "mult_3", tag: "collider multiplier", xy: "y", enabled: false });
	//#endregion
	//#region | Controller / Key Events
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
	}
	document.onkeydown = ({ key })=>{
		if (key == "a" && !contr.a) contr.a = true;
		if (key == "d" && !contr.d) contr.d = true;
		if (key == "w" && !contr.w) contr.w = true;
		if (key == "s" && !contr.s) contr.s = true;
		if (key == "e" && !contr.e) (contr.e = true, triggers.press_e())
	}
	document.onkeyup = ({ key })=>{
		if (key == "a") contr.a = false;
		if (key == "d") contr.d = false;
		if (key == "w") contr.w = false;
		if (key == "s") contr.s = false;
		if (key == "e") contr.e = false;
	}
	window.onblur = ()=> {
		contr.a = contr.d = contr.w = contr.s = false;
	}
	//#endregion
	
</script>

<main bind:this={main}>
	<canvas bind:this={canvas}></canvas>
	<h3 id="cash">Cash: {$cash}</h3>
	<div id="trigger-info" style="display: {on_trigger ? "block" : "none"};" bind:this={trigger_info}></div>
</main>

<style>
	main {
		position: relative;
	}
	canvas {
		position: absolute;
		left: 0; top: 0;
		width: 100%;
		height: 100%;
	}
	#trigger-info {
		position: absolute;
		padding: 0.5rem 0.7rem;
		background-color: white;
		border-radius: 3px;
		transform: translate(-50%, -0%);
		display: none;
		border: 1px solid #333;
	}
	#cash {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0.5rem 0.7rem;
		color: white;
	}
</style>