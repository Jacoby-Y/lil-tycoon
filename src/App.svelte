<script>
	import { onMount } from "svelte";
	import Game from "./main/Game.svelte";

	let main;
	window.onresize = ()=>{
		let scale = 1;
		const w = document.body.clientWidth;
		const h = document.body.clientHeight;
		if (w*0.6 >= h) scale = h/600;
		else scale = w/1000;
		
		main.style.transform = `translate(-50%, -50%) scale(${scale-0.02}, ${scale-0.02})`;
	}
	onMount(()=>{
		window.onresize();
	});
</script>

<main bind:this={main}>
	<Game/>
</main>

<style>
	main {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		height: 100%;
		position: absolute;
		left: 50%; top: 50%;
		transform: translate(-50%, -50%);
		width: 1000px;
		height: 600px;
	}
	div {
		border: 1px solid white;
	}
</style>