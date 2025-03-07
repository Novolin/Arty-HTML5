/** this is to test some stuff with colours */

const canv = document.getElementById("tester").getContext("2d");
const redstartbox = document.getElementById("redstart");
const greenstartbox = document.getElementById("greenstart");
const runbox = document.getElementById("run");
let rgb = [0,0,0]
let rgbcss = `rgba(0,0,0,255)`;
let docycle = false;
let step = 0;

canv.fillstyle = "black";
canv.fillRect(0,0,200,200);
canv.fillstyle = "green";
canv.fillRect(0,100,200,100);

setInterval(runThingy, 30);

function startThingy(startrgb){
    /** Start running the thingy with the R/G values from the boxes */
    rgbcss = `rgba(${startrgb[0]}, ${startrgb[1]}, 0, 255)`;
    rgb = rgbcss
    step = 0;
    docycle = true

}
function runThingy(){
    if (docycle){
        step += 1
        rgb[0] = 128 + step
        if (rgb[0] > 255){
            rgb[0] = 255
        }
        rgb[1] = 255 - step
        rgbcss = `rgba(${rgb[0]}, ${rgb[1]}, 0, 255)`;
        if (step > 255){
            docycle = false
        }
    }
}

runbox.addEventListener("click", startThingy)