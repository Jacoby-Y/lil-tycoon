/** @type {CanvasRenderingContext2D}*/
let ctx;
const set_ctx = (_ctx)=>{ 
	ctx = _ctx; 
}
const circle = (x,y, r, color, fill=true, l_width=1)=>{
	if (ctx == undefined) return;
	if (fill) ctx.fillStyle = color;
	else { ctx.strokeStyle = color; ctx.lineWidth = l_width; }
	ctx.beginPath();
	ctx.arc(x,y, r, 0, Math.PI*2);
	if (fill) ctx.fill();
	else ctx.stroke();
}
const rect = (x,y, w,h, color, fill=true, l_width=1)=>{
	if (ctx == undefined) return;
	if (fill) ctx.fillStyle = color;
	else { ctx.strokeStyle = color; ctx.lineWidth = l_width; }
	if (fill) ctx.fillRect(x,y, w,h);
	else ctx.strokeRect(x,y, w,h);
}
const image = (img, sx=0, sy=0, sWidth=100, sHeight=100)=>{
	ctx.drawImage(img, sx, sy, sWidth, sHeight);
}

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
}
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
}

const transform = (x=0,y=0, ang=0)=>{
	ctx.translate(x,y);
	ctx.rotate(ang);
}
const reset = ()=>{
	ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export default {
	set_ctx,
	circle,
	rect,
	image,
	new_path,
	path,
	transform,
	reset
};