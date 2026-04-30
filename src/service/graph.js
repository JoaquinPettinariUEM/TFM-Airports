const graph = {};

export function buildGraph(routes, airports) {
  airports.forEach(ap => {
    graph[ap._id] = [];
  });

  routes.forEach(route => {
    const { from, to, distance, price } = route;

    if (!graph[from]) graph[from] = [];

    graph[from].push({
      to,
      distance,
      price,
    });
  });

  return graph;
}

export const getGraph = () => {
  return graph;
};
