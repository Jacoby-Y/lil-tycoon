import { writable, get } from "svelte/store";
import draw from "./utils/draw.js";

/** @type {HTMLCanvasElement}*/
export const canvas = writable(null);
let w = 0, h = 0;
canvas.subscribe((v)=>{
	if (v != null) {
		w = v.width;
		h = v.height;
	}
})

export const timer = writable(0);
setInterval(() => { 
	timer.update((v)=>(v+1)%30); 
	job_m.update();
}, 1000/30);

export const job_m = {
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
}

export const mouse = {
	x: -1, y: -1,
	hover: false,
	down: false,
}

export const player = {
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
}
export const contr = {
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