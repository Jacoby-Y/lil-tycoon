import draw from "./draw.js";
import { player } from "../game.js";

export const entity_m = (()=>{
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

export class Entity {
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
export const Systems = {
	Position(pos, ent) { },
	Graphic(gr, ent) {
		if (ent.Position != undefined) draw.transform(ent.Position.x, ent.Position.y);
		gr.draw(ent);
		draw.reset();
	},
	Collider(col, ent) {
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

			if (closest == to_top) player.y = y-player.size;
			if (closest == to_bottom) player.y = y+h;
			if (closest == to_left) player.x = x-player.size;
			if (closest == to_right) player.x = x+w;
		} else if (col.hit) col.hit = false;
		draw.rect(x, y, w, h, color, fill)
	},
	Trigger(trig, ent) {
		if (ent.Position == undefined) throw `Entities with Triggers need positions!\nId: ${ent.id}, Tag: ${ent.tag}`
		const { x, y } = ent.Position;
		const { w, h } = trig;
		const color = check_overlap(x,y, w,h, player.x, player.y, player.size, player.size) ? trig.color.on : trig.color.off;
		draw.rect(x,y, w, h, color);
	},
}