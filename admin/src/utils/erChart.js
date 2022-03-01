import dagre from 'dagre';
import _ from 'lodash';
import * as SRD from './storm-react-diagrams';
import go from "gojs";

export function autoLayout(engine, model) {
  const options = {
    graph: {
      rankdir: 'RL',
      ranker: 'longest-path',
      marginx: 25,
      marginy: 25,
    },
    includeLinks: true,
  };
  // Create a new directed graph
  var g = new dagre.graphlib.Graph({
    multigraph: true,
  });
  g.setGraph(options.graph);
  g.setDefaultEdgeLabel(function () {
    return {};
  });

  const processedlinks = {};

  // set nodes
  _.forEach(model.getNodes(), (node) => {
    g.setNode(node.getID(), { width: node.width, height: node.height });
  });

  _.forEach(model.getLinks(), (link) => {
    // set edges
    if (link.getSourcePort() && link.getTargetPort()) {
      processedlinks[link.getID()] = true;
      g.setEdge({
        v: link.getSourcePort().getNode().getID(),
        w: link.getTargetPort().getNode().getID(),
        name: link.getID(),
      });
    }
  });

  // layout the graph
  dagre.layout(g);
  g.nodes().forEach((v) => {
    const node = g.node(v);
    model.getNode(v).setPosition(node.x - node.width / 2, node.y - node.height / 2);
  });
  engine.repaintCanvas();
}

export function drawNodes(data) {
  const engine = new SRD.DiagramEngine();
  engine.installDefaultFactories();
  const model = new SRD.DiagramModel();
  const nodes = [],
    nodesMap = {},
    links = [];

  data.forEach((model, index) => {
    console.log(`Model name: ${model.name}`);
    const node = new SRD.DefaultNodeModel(model.name, 'rgb(0,126,255)');
    const ports = {
      'id-in': node.addInPort('id'),
      'id-out': node.addOutPort('-')
    };

    Object.keys(model.attributes).forEach((attr) => {
      console.log(` - Property:`, attr);
      ports[`${attr}-in`] = node.addInPort(attr);
      ports[`${attr}-out`] = node.addOutPort('-');
    });
    node.setPosition(150 * index, 100);
    nodes.push(node);
    nodesMap[model.key] = { node, ports };
  });

  console.log(nodesMap);

  data.forEach((model, index) => {
    Object.keys(model.attributes).forEach((attr) => {
      const fieldData = model.attributes[attr];
      const relation = fieldData.type === 'relation' && fieldData?.target?.substring(fieldData.target.lastIndexOf('.') + 1);
      const relationField = fieldData.inversedBy;
      if (relation && nodesMap[relation]) {
        const inPort = nodesMap[relation].ports[`${attr}-out`] || nodesMap[relation].ports['id-out'];
        const connection = nodesMap[relation].ports[`${relationField}-in` || 'id-in'];
        if (inPort && connection) {
          const link = inPort.link(connection);
          link.addLabel(fieldData.relation);
          if (link) {
            links.push(link);
          }
        }
      }
    });
  });

  model.addAll(...nodes, ...links);
  engine.setDiagramModel(model);
  return { engine, model };
}

export function getConfiguration(data) {
  // Since 2.2 you can also author concise templates with method chaining instead of GraphObject.make
  // For details, see https://gojs.net/latest/intro/buildingObjects.html
  const $ = go.GraphObject.make;  // for conciseness in defining templates

  const myDiagram =
    $(go.Diagram, "erd",  // must name or refer to the DIV HTML element
      {
        allowDelete: false,
        allowCopy: false,
        layout: $(go.ForceDirectedLayout),
        "undoManager.isEnabled": true
      });

  var colors = {
    'red': '#be4b15',
    'green': '#52ce60',
    'blue': '#6ea5f8',
    'lightred': '#fd8852',
    'lightblue': '#afd4fe',
    'lightgreen': '#b9e986',
    'pink': '#faadc1',
    'purple': '#d689ff',
    'orange': '#fdb400',
  }

  // the template for each attribute in a node's array of item data
  var itemTempl =
    $(go.Panel, "Horizontal",
      $(go.Shape,
        { desiredSize: new go.Size(15, 15), strokeJoin: "round", strokeWidth: 3, stroke: null, margin: 2 },
        new go.Binding("figure", "figure"),
        new go.Binding("fill", "color"),
        new go.Binding("stroke", "color")),
      $(go.TextBlock,
        {
          stroke: "#333333",
          font: "bold 14px sans-serif"
        },
        new go.Binding("text", "name"))
    );

  // define the Node template, representing an entity
  myDiagram.nodeTemplate =
    $(go.Node, "Auto",  // the whole node panel
      {
        selectionAdorned: true,
        resizable: true,
        layoutConditions: go.Part.LayoutStandard & ~go.Part.LayoutNodeSized,
        fromSpot: go.Spot.AllSides,
        toSpot: go.Spot.AllSides,
        isShadowed: true,
        shadowOffset: new go.Point(3, 3),
        shadowColor: "#C5C1AA"
      },
      new go.Binding("location", "location").makeTwoWay(),
      // whenever the PanelExpanderButton changes the visible property of the "LIST" panel,
      // clear out any desiredSize set by the ResizingTool.
      new go.Binding("desiredSize", "visible", v => new go.Size(NaN, NaN)).ofObject("LIST"),
      // define the node's outer shape, which will surround the Table
      $(go.Shape, "RoundedRectangle",
        { fill: 'white', stroke: "#eeeeee", strokeWidth: 3 }),
      $(go.Panel, "Table",
        { margin: 8, stretch: go.GraphObject.Fill },
        $(go.RowColumnDefinition, { row: 0, sizing: go.RowColumnDefinition.None }),
        // the table header
        $(go.TextBlock,
          {
            row: 0, alignment: go.Spot.Center,
            margin: new go.Margin(0, 24, 0, 2),  // leave room for Button
            font: "bold 16px sans-serif"
          },
          new go.Binding("text", "key")),
        // the collapse/expand button
        $("PanelExpanderButton", "LIST",  // the name of the element whose visibility this button toggles
          { row: 0, alignment: go.Spot.TopRight }),
        // the list of Panels, each showing an attribute
        $(go.Panel, "Vertical",
          {
            name: "LIST",
            row: 1,
            padding: 3,
            alignment: go.Spot.TopLeft,
            defaultAlignment: go.Spot.Left,
            stretch: go.GraphObject.Horizontal,
            itemTemplate: itemTempl
          },
          new go.Binding("itemArray", "items"))
      )  // end Table Panel
    );  // end Node

  // define the Link template, representing a relationship
  myDiagram.linkTemplate =
    $(go.Link,  // the whole link panel
      {
        selectionAdorned: true,
        layerName: "Foreground",
        reshapable: true,
        routing: go.Link.AvoidsNodes,
        corner: 5,
        curve: go.Link.JumpOver
      },
      $(go.Shape,  // the link shape
        { stroke: "#303B45", strokeWidth: 2.5 }),
      $(go.TextBlock,  // the "from" label
        {
          textAlign: "center",
          font: "bold 14px sans-serif",
          stroke: "#1967B3",
          segmentIndex: 0,
          segmentOffset: new go.Point(NaN, NaN),
          segmentOrientation: go.Link.OrientUpright
        },
        new go.Binding("text", "text")),
      $(go.TextBlock,  // the "to" label
        {
          textAlign: "center",
          font: "bold 14px sans-serif",
          stroke: "#1967B3",
          segmentIndex: -1,
          segmentOffset: new go.Point(NaN, NaN),
          segmentOrientation: go.Link.OrientUpright
        },
        new go.Binding("text", "toText"))
    );

  var nodeDataArray = [];
  data.forEach((model, index) => {
    const node = {
      key: model.key,
      items: [
        {
          name: "id",
          iskey: true,
          figure: "Decision",
          color: colors.red
        }
      ]
    };
    console.log(`Model name: ${model.name}`);
    Object.keys(model.attributes).forEach((attr) => {
      console.log(` - Property:`, attr);
      node.items.push({
        name: attr,
        iskey: false,
        figure: "Decision",
        color: colors.blue
      });
    });
  });
  
  var linkDataArray = [
    { from: "Products", to: "Suppliers", text: "0..N", toText: "1" },
    { from: "Products", to: "Categories", text: "0..N", toText: "1" },
    { from: "Order Details", to: "Products", text: "0..N", toText: "1" }
  ];
  data.forEach((model, index) => {
    Object.keys(model.attributes).forEach((attr) => {
      const fieldData = model.attributes[attr];
      const relation = fieldData.type === 'relation' && fieldData?.target?.substring(fieldData.target.lastIndexOf('.') + 1);
      if (relation) {
        const link = { 
          from: model.key, 
          to: relation, 
          text: fieldData.relation, 
          toText: "1" 
        };
        linkDataArray.push(link);
      }
    });
  });

  myDiagram.model = new go.GraphLinksModel(
    {
      copiesArrays: true,
      copiesArrayObjects: true,
      nodeDataArray: nodeDataArray,
      linkDataArray: linkDataArray
    });
}
