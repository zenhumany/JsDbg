"use strict";

var CCLayerTree = undefined;
Loader.OnLoad(function() {
    CCLayerTree = {
        Tree: new DbgObjectTree.DbgObjectTreeReader(),
        Renderer: new DbgObjectTree.DbgObjectRenderer(),
        InterpretAddress: function(address) {
            // Handle both Layer and LayerTreeHost (the latter should only ever appear
            // at the root)
            var voidObj = DbgObject.create("ntdll!void", address);
            if (!voidObj.isNull()) {
                return voidObj.dcast(Chromium.ChildProcessType("cc", "cc::Layer"))
                .then(layer => {
                    if (!layer.isNull()) {
                        return layer.vcast();
                    } else {
                        return voidObj.dcast(Chromium.ChildProcessType("cc", "cc::LayerTreeHost"));
                    }
                })
            }
            return DbgObject.NULL;
        },
        GetRoots: function() {
            // Grovel around the global view map to find a LayerTreeHost pointer.
            // At this point in time, we've only ever seen a single RenderWidget
            // (the renderViewImplPointer) in a given renderer process. Once this
            // map is better understood, we may want to add sorting functionlity
            // to have the 'most important' layer tree host be the first entry.
            return DbgObject.global(Chromium.ChildProcessModuleName("content"), "g_view_map")
            .then((viewMap) => {
                return Promise.map(viewMap.F("Object").array("Values"), renderViewImplPointer => renderViewImplPointer.deref().f("layer_tree_view_").F("Object").f("layer_tree_host_").F("Object"));
            });
        },
        DefaultTypes: []
    };

    CCLayerTree.Tree.addChildren(Chromium.ChildProcessType("cc", "cc::Layer"), (parentLayer) => {
        return parentLayer.f("inputs_").f("children").array("Elements").map(scoped_ref_ptr => scoped_ref_ptr.f("ptr_").vcast());
    });

    CCLayerTree.Tree.addChildren(Chromium.ChildProcessType("cc", "cc::LayerTreeHost"), (layerTreeHost) => {
        return layerTreeHost.f("root_layer_.ptr_").vcast();
    });

    DbgObject.AddAction(Chromium.ChildProcessType("cc", "cc::LayerTreeHost"), "CCLayerTree", (layerTreeHost) => {
        return TreeInspector.GetActions("cclayertree", "CCLayerTree", layerTreeHost);
    });

    DbgObject.AddAction(Chromium.ChildProcessType("cc", "cc::Layer"), "CCLayerTree", (layer) => {
        return TreeInspector.GetActions("cclayertree", "CCLayerTree", layer);
    });

    DbgObject.AddTypeDescription(
        Chromium.ChildProcessType("cc", "cc::Layer"),
        "bounds",
        false,
        UserEditableFunctions.Create((layer) => layer.f("inputs_").f("bounds").desc())
    );

});