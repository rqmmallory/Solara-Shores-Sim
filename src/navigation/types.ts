export type RootStackParamList = {
  Tabs: undefined;
  Module: { moduleId: string };
  Quiz: { moduleId?: string; review?: boolean };
  Decision: { moduleId: string; decisionId: string };
  SimRun: { phaseId: string };
};

export type TabParamList = {
  Home: undefined;
  Learn: undefined;
  Math: undefined;
  Sim: undefined;
};
