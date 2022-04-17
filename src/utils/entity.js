import draw from "./draw.js";
import { drop_speeds, player } from "../game.js";
import { cash } from "../stores.js";
import { dist2 } from "../utils/utils.js";

export const entity_m = (()=>{
	const list = [];
	const ids = {};
	const pool = {
		with_comp: {},
	};

	return {
		new(ent) {
			list.push(ent);
		},
		get last() { return list.at(-1); },
		update() {
			// for (let i = 0; i < list.length; i++) {
			for (let i = list.length-1; i >= 0; i--) {
				const ent = list[i];
				if (ent.destroy === true) { 
					list.splice(i, 1); 
					if (ent.id != undefined && ent.id != "none") delete ids[ent.id];
					continue; 
				}
				if (ent.enabled === false) continue;
				for (const k in ent) {
					if (!Object.hasOwnProperty.call(ent, k) || Systems[k] == undefined) continue;
					const v = ent[k];
					Systems[k](v, ent);
				}
			}
		},
		get list() { return list; },

		gid(id) {
			if (ids[id] != undefined) return ids[id]; 
			for (let i = 0; i < list.length; i++) {
				const ent = list[i];
				if (ent.id == id) {
					ids[id] = ent;
					return ent;
				}
			}
		},
		all_comps(comp) {
			let res = [];
			for (let i = 0; i < list.length; i++) {
				const ent = list[i];
				if (ent[comp] != undefined) res.push(ent[comp]);
			}
			return res;
		},
		all_with_comp(comp, and_enabled=true) {
			let res = [];
			const _list = pool.with_comp[comp] ?? list;
			for (let i = 0; i < _list.length; i++) {
				const ent = _list[i];
				if (ent[comp] != undefined) {
					if (and_enabled && ent.enabled == true) res.push(ent);
					else if (!and_enabled) res.push(ent);
				}
			}
			return res;
		},
		tag(tag) {
			const res = [];
			for (let i = 0; i < list.length; i++) {
				const ent = list[i];
				if (ent.tag == tag) res.push(ent);
			}
			return res;
		},
		match(fn=(ent)=>true) {
			const res = [];
			for (let i = 0; i < list.length; i++) {
				const ent = list[i];
				if (fn(ent) == true) res.push(ent);
			}
			return res;
		},
		pool_all_with_comp(comp) {
			pool.with_comp[comp] = this.all_with_comp(comp, false);
		},
		get pool() { return pool; },
	}
})();
export class Entity {
	constructor(options={ tag: "none", id: "none" }, enabled=true, callback=entity_m.new) {
		this.tag = options.tag ?? "none";
		this.id = options.id ?? "none";
		this.enabled = enabled;
		callback(this);
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
}
export const closest_trig = (pos)=>{
	const ents_on = entity_m.all_with_comp("Trigger").filter(v => v.Trigger.on);
	if (ents_on.length <= 0) return null;
	if (ents_on.length == 1) return ents_on[0];
	const closest = { ent: null, dist: Infinity };
	for (let i = 0; i < ents_on.length; i++) {
		const ent = ents_on[i];
		const dist = dist2(pos, ent.Position);
		closest.dist > dist && (closest.dist = dist, closest.ent = ent);
	}
	return closest.ent;
}
const orb_lvls = [ "#ffffff", "#ff8282", "#ffb482", "#fcff82", "#a9ff82", "#82ffbb", "#82f3ff", "#82aaff", "#a782ff", "#ff82fc"];
const multiply = (axis, p1, p2)=>{
	const mults = entity_m.pool.with_comp.Upgrader.filter(ent => ent.Upgrader.axis == axis && ent.enabled == true);
	for (let i = 0; i < mults.length; i++) {
		const mult = mults[i];
		const { x, y } = mult.Position;
		if (axis == "y") {
			if (p1 < y+10 && p2 >= y+10) return 1;
		} else if (axis == "x") {
			if (p1 < x+10 && p2 >= x+10) return 1;
		}
	}
	return 0;
}

export const Components = {
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
		constructor(w, h, color="black") {
			this.w = w;
			this.h = h;
			this.color = color;
			this.fill = true;
			this.on_hit = ()=>{};
		}
	},
	Trigger: class Trigger {
		constructor(w=10, h=10, color={ on: "#ff6b0099", off: "#ff000099" }, hint="...") {
			this.w = w;
			this.h = h;
			this.color = {
				on: color?.on ?? "#ff6b0099",
				off: color?.off ?? "#ff000099",
			};
			this.on = false;
			this.activate = ()=>{};
			this.hint = hint;
		}
	},
	Dropper: class Dropper {
		constructor(x,y) {
			this.x = x;
			this.y = y;
			this.ticks = 0;
		}
	},
	Upgrader: class Upgrader {
		constructor(axis) {
			this.axis = axis;
		}
	},
	Orb: class Orb {
		constructor(lvl=0, val=1) {
			this.lvl = lvl;
			this.val = val;
		}
	},
	OrbManager: class OrbManager {
		constructor() {
			this.list = [];
		}
		new(orb) {
			this.list.push(orb);
		}
	}
};

export const Systems = {
	Position(pos, ent) {},
	Graphic(gr, ent) {
		if (ent.Position != undefined) draw.transform(ent.Position.x, ent.Position.y);
		gr.draw(ent);
		draw.reset();
	},
	Collider(col, ent) {
		const { w, h, on_hit } = col;
		const { x, y } = ent.Position;
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

			if (closest == to_top) player.y = y-player.size;
			if (closest == to_bottom) player.y = y+h;
			if (closest == to_left) player.x = x-player.size;
			if (closest == to_right) player.x = x+w;
		} else if (col.hit) col.hit = false;
		ent.Graphic ?? (color != "#" && draw.rect(x, y, w, h, color, fill));
	},
	Trigger(trig, ent) {
		if (ent.Position == undefined) throw `Entities with Triggers need positions!\nId: ${ent.id}, Tag: ${ent.tag}`
		const { x, y } = ent.Position;
		const { w, h } = trig;
		const overlap = trig.on = check_overlap(x,y, w,h, player.x, player.y, player.size, player.size);
		const color = overlap && ent == closest_trig(player) ? trig.color.on : trig.color.off;
		draw.rect(x,y, w, h, color);
		draw.rect(x,y, w, h, color, false);
	},
	Dropper(drop, ent) {
		if (ent.tag == "drop_group_1") {
			draw.transform(ent.Position.x, ent.Position.y);
			draw.rect(0,-3, 30,46, "#3c3c3c");
			draw.rect(30,5, 45,30, "#3c3c3c");
			draw.reset();
		} else if (ent.tag == "drop_group_2") {
			draw.transform(ent.Position.x, ent.Position.y);
			draw.rect(5,0, 30,45, "#3c3c3c");
			draw.rect(-3,45, 46,30, "#3c3c3c");
			draw.reset();
		}

		if (0 < drop.ticks--) return;
		drop.ticks = drop_speeds[ent.tag];
		const off = (Math.round(Math.random()*15-10)); 
		const x = drop.x + (ent.tag == "drop_group_1" ? off : 0);
		const y = drop.y + (ent.tag == "drop_group_2" ? off : 0); 
		entity_m.gid("orb_m").OrbManager.new({
			x, y, off,
			lvl: 0, val: 1,
		});
	},
	Upgrader(mult, ent) {
		draw.transform(ent.Position.x, ent.Position.y);
		if (mult.axis == "y") {
			draw.rect(0,0, 5, 25, "#00aba7");
			draw.rect(5,5, 50, 15, "#00aba7");
			draw.rect(55,0, 5, 25, "#00aba7");
		} else if (mult.axis == "x") {
			draw.rect(0,0, 25, 5, "#00aba7");
			draw.rect(5,5, 15, 50, "#00aba7");
			draw.rect(0,55, 25, 5, "#00aba7");
		}
		draw.reset();
	},
	Orb(orb, ent) {
		let move_axis = "";
		if (orb.x-orb.off < 920) (orb.lvl += multiply("x", orb.x, ++orb.x), move_axis = "x");
		else if (orb.y < 510) (orb.lvl += multiply("y", orb.y, ++orb.y), move_axis = "y");
		else {
			ent.destroy = true;
			cash.update( v => v+orb.val+orb.lvl );
			return;
		}
		
		// draw.circle(orb.x, orb.y, 5, orb_lvls[orb.lvl]);
		draw.rect(orb.x-5, orb.y-5, 10, 10, orb_lvls[orb.lvl]+"66");
		
	},
	OrbManager(om, ent) {
		// for (let i = 0; i < om.list.length; i++) {
		for (let i = om.list.length-1; i >= 0; i--) {
			const orb = om.list[i];
			this.Orb(orb, orb);
			if (orb.destroy === true) om.list.splice(i, 1);
		}
	},
};