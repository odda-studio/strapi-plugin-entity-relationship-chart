import dagre from 'dagre';
import _ from 'lodash';
import * as SRD from './storm-react-diagrams';

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
      'id': {
        in: node.addInPort('id'),
        out: node.addOutPort('id')
      }
    };

    Object.keys(model.attributes).forEach((attr) => {
      console.log(` - Property:`, attr);
      ports[attr] = {
        in: node.addInPort(attr),
        out: node.addOutPort(attr)
      };
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
        const inPort = (nodesMap[relation].ports[attr] || nodesMap[relation].ports['id'] || {}).in;
        if (inPort) {
          const link = inPort.link(nodesMap[relation].ports[relationField || 'id']);
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
