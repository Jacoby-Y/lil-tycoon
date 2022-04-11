import { writable, get } from "svelte/store";

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