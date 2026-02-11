export const writePlanTool = {
  name: 'write_plan',
  description: `Write a plan to complete the current task in the order of execution, including the steps and the description of each step.
The plan should be friendly to showcase to the user.`,
  parameters: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['title']
        },
        description: 'The list of steps, in the order of execution'
      }
    },
    required: ['steps']
  },
  execute: async (args, context) => {
    console.log('write_plan_tool executed');
    return "<hide_in_user_ui> Plan made. Now you can start executing the plan, or handoff the task to the suitable agent who specializes in the steps of the plan.</hide_from_user>";
  }
};
