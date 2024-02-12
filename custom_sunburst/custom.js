/*
 * This is a novem custom visualization
 *
 * in this context you have access to the following
 * global variables:
 *
 * `info`   - the novem info object `https://novem.no/docs/plot/custom/#info`
 * `render` - the novem render object `https://novem.no/docs/plot/custom/#render`
 * `node`   - a javascript reference to the dom node you should render into
 * `width`  - the current width of the target
 * `height` - the current height of the target
 *
 * To support your rendering you also have access to the following libraries
 * `R`      - ramda version 29.0,0
 * `d3`     - d3.js version 7.0
 * `Plot`   - Observable plot 0.6
 *
 **/

// Write your code here


const breadcrumbWidth = 75
const breadcrumbHeight = 30

const h = height - breadcrumbHeight - 50
const w = h
const radius = h / 2

const hold = d3.select(node)
	.style('max-width',`${w}px`)
	.classed('hold',true)



const partition = data =>
  d3.partition().size([2 * Math.PI, radius * radius])(
    d3
      .hierarchy(data)
      .sum(d => d.value)
      //.sort((a, b) => b.value - a.value)
  )

const color = d3
  .scaleOrdinal()
  .domain(["home", "product", "search", "account", "other", "end"])
  .range(["#5d85cf", "#7c6561", "#da7847", "#6fb971", "#9e70cf", "#bbbbbb"])

const arc = d3
  .arc()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .padAngle(1 / radius)
  .padRadius(radius)
  .innerRadius(d => Math.sqrt(d.y0))
  .outerRadius(d => Math.sqrt(d.y1) - 1)

const mousearc = d3
  .arc()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .innerRadius(d => Math.sqrt(d.y0))
  .outerRadius(radius)


function buildHierarchy(csv) {
  // Helper function that transforms the given CSV into a hierarchical format.
  const root = { name: "root", children: [] };
  for (let i = 0; i < csv.length; i++) {
    const sequence = csv[i][0];
    const size = +csv[i][1];
    if (isNaN(size)) {
      // e.g. if this is a header row
      continue;
    }
    const parts = sequence.split("_");
    let currentNode = root;
    for (let j = 0; j < parts.length; j++) {
      const children = currentNode["children"];
      const nodeName = parts[j];
      let childNode = null;
      if (j + 1 < parts.length) {
        // Not yet at the end of the sequence; move down the tree.
        let foundChild = false;
        for (let k = 0; k < children.length; k++) {
          if (children[k]["name"] == nodeName) {
            childNode = children[k];
            foundChild = true;
            break;
          }
        }
        // If we don't already have a child node for this branch, create it.
        if (!foundChild) {
          childNode = { name: nodeName, children: [] };
          children.push(childNode);
        }
        currentNode = childNode;
      } else {
        // Reached the end of the sequence; create a leaf node.
        childNode = { name: nodeName, value: size };
        children.push(childNode);
      }
    }
  }
  return root;
}

function breadcrumbPoints(d, i) {
  const tipWidth = 10;
  const points = [];
  points.push("0,0");
  points.push(`${breadcrumbWidth},0`);
  points.push(`${breadcrumbWidth + tipWidth},${breadcrumbHeight / 2}`);
  points.push(`${breadcrumbWidth},${breadcrumbHeight}`);
  points.push(`0,${breadcrumbHeight}`);
  if (i > 0) {
    // Leftmost breadcrumb; don't include 6th vertex.
    points.push(`${tipWidth},${breadcrumbHeight / 2}`);
  }
  return points.join(" ");
}

const data = buildHierarchy(info.data)




// Breadcrumnb holder
const asvg = hold
	.append("svg")
	.attr("viewBox", `0 0 ${breadcrumbWidth * 5} ${breadcrumbHeight}`)
	.style("font", "12px sans-serif")
	.style("margin", "5px")


const root = partition(data);

const svg = hold.append("svg");
// Make this into a view, so that the currently hovered sequence is available to the breadcrumb
const element = svg.node();
element.value = { sequence: [], percentage: 0.0, value:0 };

const label = svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    .style("visibility", "hidden");

label
	.append("tspan")
	.attr("class", "percentage")
	.attr("x", 0)
	.attr("y", 0)
	.attr("dy", "-0.1em")
	.attr("font-size", "3em")
	.text("");

label
	.append("tspan")
	.attr("x", 0)
	.attr("y", 0)
	.attr("dy", "1.5em")
	.text("deviation from target risk");

svg
	.attr("viewBox", `${-radius} ${-radius} ${w} ${w}`)
	.style("max-width", `${w}px`)
	.style("font", "12px sans-serif");


const path = svg
	.append("g")
	.selectAll("path")
	.data(
		root.descendants().filter(d => {
			// Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
			return d.depth && d.x1 - d.x0 > 0.001;
		})
	)
	.join("path")
	.attr("fill", d => color(d.data.name))
	.attr("d", arc);

svg
	.append("g")
	.attr("fill", "none")
	.attr("pointer-events", "all")
	.on("mouseleave", () => {
		path.attr("fill-opacity", 1);
		label.style("visibility", "hidden");
		// Update the value of this view
		element.value = { sequence: [], percentage: 0.0, value:0 };
		element.dispatchEvent(new CustomEvent("input"));
	})
	.selectAll("path")
	.data(
		root.descendants().filter(d => {
			// Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
			return d.depth && d.x1 - d.x0 > 0.001;
		})
	)
	.join("path")
	.attr("d", mousearc)
	.on("mouseenter", (event, d) => {
		// Get the ancestors of the current segment, minus the root
		const sequence = d
			.ancestors()
			.reverse()
			.slice(1);
		// Highlight the ancestors
		path.attr("fill-opacity", node =>
			sequence.indexOf(node) >= 0 ? 1.0 : 0.3
		);
		const percentage = ((100 * d.value) / root.value).toPrecision(3);
    const value = d.value
		label
			.style("visibility", null)
			.select(".percentage")
			//.text(percentage + "%");
			.text(value + "");
		// Update the value of this view with the currently hovered sequence and percentage
		element.value = { sequence, percentage, value };
		element.dispatchEvent(new CustomEvent("input"));

	});



element.addEventListener("input", d=>{
	const sunburst = element.value

	const g = asvg
    .selectAll("g")
    .data(sunburst.sequence)
    .join("g")
    .attr("transform", (d, i) => `translate(${i * breadcrumbWidth}, 0)`);


	let e = g

  e.append("polygon")
    .attr("points", breadcrumbPoints)
    .attr("fill", d => color(d.data.name))
    .attr("stroke", "white");

  e.append("text")
    .attr("x", (breadcrumbWidth + 10) / 2)
    .attr("y", 15)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text(d => d.data.name);

	g.exit().remove()

  let a = asvg
		.selectAll('.ctext')
		.data([0])
		
  a.enter().append("text").classed('ctext',true)
	.join(a)

	//a.text(sunburst.percentage > 0 ? sunburst.percentage + "%" : "")
	a.text(sunburst.value > 0 ? sunburst.value+ "" : "")
    .attr("x", (sunburst.sequence.length + 0.5) * breadcrumbWidth)
    .attr("y", breadcrumbHeight / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle");

	a.exit().remove()

})

