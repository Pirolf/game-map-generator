
var MAX_COLOR_COMPONENT = 0xff;

/**
 * Get red component of Int color.
 */
function getRedComponent(c) {
    return (c >> 16) & 0xff;
}

/**
 * Get green component of Int color.
 */
function getGreenComponent(c) {
    return (c >> 8) & 0xff;
}

/**
 * Get blue component of Int color.
 */
function getBlueComponent(c) {
    return c & 0xff;
}

/**
 * Interpolate color between color0 and color1 using fraction f. When f==0, result is color0. When f==1, result is color1.
 * @author Amit Patel
 */
function interpolateColor(color0, color1, f) {
    var r = toInt((1 - f) * (color0 >> 16) + f * (color1 >> 16));
    var g = toInt((1 - f) * ((color0 >> 8) & 0xff) + f * ((color1 >> 8) & 0xff));
    var b = toInt((1 - f) * (color0 & 0xff) + f * (color1 & 0xff));
    if (r > 255) { r = 255; }
    if (g > 255) { g = 255; }
    if (b > 255) { b = 255; }
    return (r << 16) | (g << 8) | b;
}

/**
 * Convert a fraction (0.0 - 1.0) to a color value (0 - 0xff).
 */
function colorFraction(fraction) {
    return toInt(MAX_COLOR_COMPONENT * fraction);
}
function toInt(f){
    return f|0;
}
/**
 * Make HTML hex color string from Int value. Example: 0 -> #000000
 * @param   color Int color value.
 * @return  HTML color string.
 */
function intToHexColor(color) {
    return '#' + ('00000' + color.toString(16).toUpperCase()).substr(-6);
}

/**
 * Make HTML rgb(r,g,b,a) color string.
 * @param   red Red channel (0 - 0xff).
 * @param   green Green channel (0 - 0xff).
 * @param   blue Blue channel (0 - 0xff).
 */
function rgb(red, green, blue) {
    return 'rgb(' + red + ',' + green + ',' + blue + ')';
}

/**
 * Make HTML rgba(r,g,b,a) color string.
 * @param   red Red channel (0 - 0xff).
 * @param   green Green channel (0 - 0xff).
 * @param   blue Blue channel (0 - 0xff).
 * @param   alpha Alpha channel (0.0 - 1.0).
 */
function rgba(red, green, blue, alpha) {
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
}

/**
 * Make HTML rgb(r,g,b) color string using fractions.
 * @param   red Red channel (0.0 - 1.0).
 * @param   green Green channel (0.0 - 1.0).
 * @param   blue Blue channel (0.0 - 1.0).
 */
function rgbF(red, green, blue) {
    return 'rgb(' + red * 100 + '%,' + green * 100 + '%,' + blue * 100 + '%)';
}

/**
 * Make HTML rgba(r,g,b,a) color string using fractions.
 * @param   red Red channel (0.0 - 1.0).
 * @param   green Green channel (0.0 - 1.0).
 * @param   blue Blue channel (0.0 - 1.0).
 * @param   alpha Alpha channel (0.0 - 1.0).
 */
function rgbaF (red, green, blue, alpha) {
    return 'rgba(' + red * 100 + '%,' + green * 100 + '%,' + blue * 100 + '%,' + alpha + ')';
}

/**
 * Make HTML hsl(h,s,l) color string.
 * @param   hue A degree on the color wheel (from 0 to 360) - 0 (or 360) is red, 120 is green, 240 is blue. 
 * @param   saturation A percentage value; 0.0 means a shade of gray and 1.0 is the full color.
 * @param   lightness Lightness is also a percentage; 0.0 is black, 1.0 is white.
 * @return  HTML color string.
 */
function hsl(hue, saturation, lightness) {
    return 'hsl(' + hue + ',' + saturation * 100 + '%,' + lightness * 100 + '%)';
}

/**
 * Make HTML hsla(h,s,l,a) color string.
 * @param   hue A degree on the color wheel (from 0 to 360) - 0 (or 360) is red, 120 is green, 240 is blue. 
 * @param   saturation A percentage value; 0.0 means a shade of gray and 1.0 is the full color.
 * @param   lightness Lightness is also a percentage; 0.0 is black, 1.0 is white.
 * @param   alpha Number between 0.0 (fully transparent) and 1.0 (fully opaque).
 * @return  HTML color string.
 */
function hsla(hue, saturation, lightness, alpha) {
    return 'hsla(' + hue + ',' + saturation * 100 + '%,' + lightness * 100 + '%,' + alpha + ')';
}