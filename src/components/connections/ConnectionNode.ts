import { INode } from "./INode";
import { Engine as QueryEngine } from "../Query";
import { InfluxDBConnection, InfluxDBTreeDataProvider } from "./Connection";
import {
  ExtensionContext,
  TreeItem,
  TreeItemCollapsibleState,
  OutputChannel
} from "vscode";
import { NewBucketNode } from "./BucketNode";
import { Status } from "./Status";
import { EditConnectionView } from "./EditConnectionView";

export const InfluxDBConectionsKey = "influxdb.connections";

export class ConnectionNode implements INode {
  constructor(
    public iConn: InfluxDBConnection,
    public Active: boolean,
    private readonly outputChannel: OutputChannel
  ) {}

  public getTreeItem(context: ExtensionContext): TreeItem {
    let status = this.Active ? "" : "-gray";
    let postfix = this.iConn.isDefault ? " (default)" : "";
    return {
      label: this.iConn.name + postfix,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      command: {
        title: "switchConn",
        command: "influxdb.switchConn",
        arguments: [this]
      },
      contextValue: "connection",
      iconPath: context.asAbsolutePath(`resources/influx-logo${status}.svg`)
    };
  }

  // get all buckets
  public async getChildren(): Promise<INode[]> {
    let queryEngine: QueryEngine = new QueryEngine(this.outputChannel);
    return queryEngine.GetTreeChildren(
      this.iConn,
      "buckets()",
      "Fetching buckets",
      NewBucketNode
    );
  }

  public async editConnection(
    context: ExtensionContext,
    influxDBTreeDataProvider: InfluxDBTreeDataProvider
  ) {
    const connections = context.globalState.get<{
      [key: string]: InfluxDBConnection;
    }>(InfluxDBConectionsKey);
    if (connections !== undefined) {
      let editConnView = new EditConnectionView(context);
      await editConnView.showEdit(influxDBTreeDataProvider, this.iConn);
      return;
    }
  }

  public async deleteConnection(
    context: ExtensionContext,
    influxDBTreeDataProvider: InfluxDBTreeDataProvider
  ) {
    const connections = context.globalState.get<{
      [key: string]: InfluxDBConnection;
    }>(InfluxDBConectionsKey);

    if (connections) {
      if (Status.Current !== undefined && Status.Current.id === this.iConn.id) {
        Status.Current = undefined;
      }
      delete connections[this.iConn.id];
    }

    await context.globalState.update(InfluxDBConectionsKey, connections);

    influxDBTreeDataProvider.refresh();
  }
}
