# GKE system metrics  |  Cloud Monitoring  |  Google Cloud
This document lists the metrics available in Cloud Monitoring when Google Kubernetes Engine (GKE) [system metrics](about:/kubernetes-engine/docs/how-to/configure-metrics#system-metrics) are enabled.

*   For a general explanation of the entries in the tables, including information about values like `DELTA` and `GAUGE`, see [Metric types](https://cloud.google.com/monitoring/api/v3/kinds-and-types).
    
    To chart or monitor metric types with values of type `STRING`, you must use Monitoring Query Language (MQL), and you must convert the value into a numeric value. For information about MQL string-conversion methods, see [`String`](about:/monitoring/mql/reference#string-group).
    
*   For information about the units used in the metric lists, see the [`unit` field](about:/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors#MetricDescriptor.FIELDS.unit) in the `MetricDescriptor` reference.
    
*   For information about statements of the form “Sampled every _x_ seconds” and “After sampling, data is not visible for up to _y_ seconds”, see [Additional information: metadata](about:/monitoring/api/metrics#metadata).
    
*   The resource-hierarchy level tells you if the metric is written at the project, organization, or folder level(s). When the level is not specified in the metric descriptor, the metric writes at the project level by default.
    

*   For pricing information, see [Cloud Monitoring pricing summary](about:/stackdriver/pricing#monitoring-pricing-summary).

*   For information about the meaning of launch stages such as `GA` (General Availability) and `BETA` (Preview), see [Product launch stages](about:/products#product-launch-stages).

Kubernetes metrics
------------------

Metrics from [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine).

The following list was last generated at 2025-03-06 15:20:27 UTC. For more information about this process, see [About the lists](about:/monitoring/api/metrics#generated).

### kubernetes

Metrics for [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs). For information on viewing these metrics, go to [View observability metrics](https://cloud.google.com/kubernetes-engine/docs/how-to/view-observability-metrics). Launch stages of these metrics: BETA GA

The "metric type" strings in this table must be prefixed with `kubernetes.io/`. That prefix has been omitted from the entries in the table. When querying a label, use the `metric.labels.` prefix; for example, `metric.labels.LABEL="VALUE"`.



* Metric type Launch stage (Resource hierarchy levels)Display name: Kind, Type, UnitMonitored resources
  * DescriptionLabels
* Metric type Launch stage (Resource hierarchy levels)Display name:             autoscaler/container/cpu/per_replica_recommended_request_cores            BETA             (project)            Recommended per replica request cores          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, {cpu}              k8s_scale          
  *             Number of CPU cores for the recommended CPU request for a single replica of the workload. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.              container_name:              Name of the container.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             autoscaler/container/memory/per_replica_recommended_request_bytes            BETA             (project)            Recommended per replica request bytes          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_scale          
  *             Recommended memory request for a single replica of the workload, in bytes. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.              container_name:              Name of the container.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             autoscaler/latencies/per_hpa_recommendation_scale_latency_seconds            BETA             (project)            Per HPA recommendation scale latency          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, s              k8s_scale          
  *             HPA Scaling recommendation latency (time between metrics being created and corresponding scaling recommendation being applied to the apiserver) for the HPA target. Sampled every 60 seconds. After sampling, data is not visible for up to 20 seconds.              metric_type:              type is the type of metric source. It should be one of "ContainerResource", "External", "Object", "Pods" or "Resource".           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/duty_cycle            BETA             (project)            Accelerator duty cycle          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, %              k8s_container          
  *             Percent of time over the past sample period (10s) during which the accelerator was actively processing. Values are integers between 0 and 100. Sampled every 60 seconds.              make:              Make of the accelerator (e.g. nvidia)              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator (e.g. 'Tesla P100')           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/memory_bandwidth_utilization            BETA             (project)            Memory bandwidth utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, percent              k8s_container          
  *             Current percentage of the accelerator memory bandwidth that is being used. Computed by dividing the memory bandwidth used over a sample period by the maximum supported bandwidth over the same sample period. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/memory_total            BETA             (project)            Accelerator memory total          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Total accelerator memory in bytes. Sampled every 60 seconds.              make:              Make of the accelerator (e.g. nvidia)              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator (e.g. 'Tesla P100')           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/memory_used            BETA             (project)            Accelerator memory used          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Total accelerator memory allocated in bytes. Sampled every 60 seconds.              make:              Make of the accelerator (e.g. nvidia)              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator (e.g. 'Tesla P100')           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/request            BETA             (project)            Request accelerators          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, {devices}              k8s_container          
  *             Number of accelerator devices requested by the container. Sampled every 60 seconds.              resource_name:              Name of the requested accelerator resource.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/accelerator/tensorcore_utilization            BETA             (project)            Tensorcore utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, percent              k8s_container          
  *             Current percentage of the Tensorcore that is utilized. Computed by dividing the Tensorcore operations that were performed over a sample period by the supported number of Tensorcore operations over the same sample period. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/cpu/core_usage_time            GA             (project)            CPU usage time          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DOUBLE, s{CPU}              k8s_container          
  *             Cumulative CPU usage on all cores used by the container in seconds. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/cpu/limit_cores            GA             (project)            Limit cores          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, {cpu}              k8s_container          
  *             CPU cores limit of the container. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/cpu/limit_utilization            GA             (project)            CPU limit utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_container          
  *             The fraction of the CPU limit that is currently in use on the instance. This value can be greater than 1 as a container might be allowed to exceed its CPU limit for extended periods of time. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/cpu/request_cores            GA             (project)            Request cores          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, {cpu}              k8s_container          
  *             Number of CPU cores requested by the container. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/cpu/request_utilization            GA             (project)            CPU request utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_container          
  *             The fraction of the requested CPU that is currently in use on the instance. This value can be greater than 1 as usage can exceed the request. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/ephemeral_storage/limit_bytes            GA             (project)            Ephemeral storage limit          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Local ephemeral storage limit in bytes. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/ephemeral_storage/request_bytes            GA             (project)            Ephemeral storage request          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Local ephemeral storage request in bytes. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/ephemeral_storage/used_bytes            GA             (project)            Ephemeral storage usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Local ephemeral storage usage in bytes. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/limit_bytes            GA             (project)            Memory limit          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Memory limit of the container in bytes. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/limit_utilization            GA             (project)            Memory limit utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_container          
  *             The fraction of the memory limit that is currently in use on the instance. This value cannot exceed 1 as usage cannot exceed the limit. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/page_fault_count            GA             (project)            Page faults          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_container          
  *             Number of page faults, broken down by type: major and minor.              fault_type:              Fault type - either 'major' or 'minor', with the former indicating that the page had to be loaded from disk.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/request_bytes            GA             (project)            Memory request          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Memory request of the container in bytes. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/request_utilization            GA             (project)            Memory request utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_container          
  *             The fraction of the requested memory that is currently in use on the instance. This value can be greater than 1 as usage can exceed the request. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/memory/used_bytes            GA             (project)            Memory usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_container          
  *             Memory usage in bytes. Sampled every 60 seconds.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/multislice/accelerator/device_to_host_transfer_latencies            BETA             (project)            Device to Host transfer latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, DISTRIBUTION, us              k8s_container          
  *             Distribution of device to host transfer latency for each chunk of data for multislice traffic. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              buffer_size:              Size of the buffer.              make:              Make of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/multislice/accelerator/host_to_device_transfer_latencies            BETA             (project)            Host to Device transfer latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, DISTRIBUTION, us              k8s_container          
  *             Distribution of host to device transfer latency for each chunk of data for multislice traffic. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              buffer_size:              Size of the buffer.              make:              Make of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/multislice/network/collective_end_to_end_latencies            BETA             (project)            Collective latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, DISTRIBUTION, us              k8s_container          
  *             Distribution of end to end collective latency for multislice traffic. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              collective_type:              Collective operation type.              input_size:              Size of the message.              make:              Make of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/multislice/network/dcn_transfer_latencies            BETA             (project)            DCN (Data Center Network) transfer latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, DISTRIBUTION, us              k8s_container          
  *             Distribution of network transfer latencies for multislice traffic. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              buffer_size:              Size of the buffer.              make:              Make of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.              type:              Protocol Type.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/restart_count            GA             (project)            Restart count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_container          
  *             Number of times the container has restarted. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             container/uptime            GA             (project)            Uptime          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, s              k8s_container          
  *             Time in seconds that the container has been running. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/file_cache_read_bytes_count            BETA             (project)            File cache read bytes count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_pod          
  *             The cumulative number of bytes read from file cache along with read type - Sequential/Random. Sampled every 10 seconds.              read_type:              Type of read, either sequential or random.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/file_cache_read_count            BETA             (project)            File cache read count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             Specifies the cumulative number of read requests made via file cache along with type - Sequential/Random and cache hit - true/false. Sampled every 10 seconds.              cache_hit:                (BOOL)              Cache hit or miss.              read_type:              Type of read, either sequential or random.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/file_cache_read_latencies            BETA             (project)            File cache read latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DISTRIBUTION, us              k8s_pod          
  *             The cumulative distribution of the file cache read latencies along with cache hit - true/false. Sampled every 10 seconds.              cache_hit:                (BOOL)              Cache hit or miss.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/fs_ops_count            BETA             (project)            File system operations count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             The cumulative number of operations processed by the filesystem. Sampled every 10 seconds.              fs_op:              Filesystem operation type.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/fs_ops_error_count            BETA             (project)            File system operations error count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             The cumulative number of errors generated by filesystem operations. Sampled every 10 seconds.              fs_op:              Filesystem operation type.              fs_error_category:              Filesystem error category.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/fs_ops_latencies            BETA             (project)            File system operation latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DISTRIBUTION, us              k8s_pod          
  *             The cumulative distribution of filesystem operation latencies. Sampled every 10 seconds.              fs_op:              Filesystem operation type.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_download_bytes_count            BETA             (project)            GCS download bytes count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_pod          
  *             The cumulative number of bytes downloaded from GCS along with type - Sequential/Random. Sampled every 10 seconds.              read_type:              Type of read, either sequential or random.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_read_bytes_count            BETA             (project)            GCS read bytes count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_pod          
  *             The cumulative number of bytes read from GCS objects. Sampled every 10 seconds.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_read_count            BETA             (project)            GCS read count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             Specifies the cumulative number of GCS reads made along with type - Sequential/Random. Sampled every 10 seconds.              read_type:              Type of read, either sequential or random.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_reader_count            BETA             (project)            GCS reader count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             The cumulative number of GCS object readers opened or closed. Sampled every 10 seconds.              io_method:              The name of the IO method.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_request_count            BETA             (project)            GCS request count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, 1              k8s_pod          
  *             The cumulative number of GCS requests processed. Sampled every 10 seconds.              gcs_method:              The name of the GCS method.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             gcsfusecsi/gcs_request_latencies            BETA             (project)            GCS request latencies          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DISTRIBUTION, us              k8s_pod          
  *             The cumulative distribution of GCS request latencies. Sampled every 10 seconds.              gcs_method:              The name of the GCS method.              volume_name:              Name of the GCSFuse CSI backed volume.              bucket_name:              Name of the GCS Bucket.              pod_uid:              Pod UID.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/accelerator/duty_cycle            BETA             (project)            Accelerator duty cycle with node          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, percent              k8s_node          
  *             Percent of time over the past sample period (10s) during which the accelerator was actively processing. Sampled every 60 seconds.              make:               Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/accelerator/memory_bandwidth_utilization            BETA             (project)            Memory bandwidth utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, percent              k8s_node          
  *             Current percentage of the accelerator memory bandwidth that is being used. Computed by dividing the memory bandwidth used over a sample period by the maximum supported bandwidth over the same sample period. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/accelerator/memory_total            BETA             (project)            Accelerator memory total with node          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, bytes              k8s_node          
  *             Total accelerator memory in bytes. Sampled every 60 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/accelerator/memory_used            BETA             (project)            Accelerator memory used with node          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, bytes              k8s_node          
  *             Total accelerator memory allocated in bytes. Sampled every 60 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/accelerator/tensorcore_utilization            BETA             (project)            Tensorcore utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, percent              k8s_node          
  *             Current percentage of the Tensorcore that is utilized. Computed by dividing the Tensorcore operations that were performed over a sample period by the supported number of Tensorcore operations over the same sample period. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              make:              Make of the accelerator.              accelerator_id:              ID of the accelerator.              model:              Model of the accelerator.              tpu_topology:              Topology of the TPU accelerator.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/cpu/allocatable_cores            GA             (project)            Allocatable cores          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, {cpu}              k8s_node          
  *             Number of allocatable CPU cores on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/cpu/allocatable_utilization            GA             (project)            CPU allocatable utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_node          
  *             The fraction of the allocatable CPU that is currently in use on the instance. Sampled every 60 seconds. After sampling, data is not visible for up to 240 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/cpu/core_usage_time            GA             (project)            CPU usage time          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DOUBLE, s{CPU}              k8s_node          
  *             Cumulative CPU usage on all cores used on the node in seconds. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/cpu/total_cores            GA             (project)            Total cores          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, {cpu}              k8s_node          
  *             Total number of CPU cores on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/ephemeral_storage/allocatable_bytes            GA             (project)            Allocatable ephemeral storage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Local ephemeral storage bytes allocatable on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/ephemeral_storage/inodes_free            GA             (project)            Free inodes          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_node          
  *             Free number of inodes on local ephemeral storage. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/ephemeral_storage/inodes_total            GA             (project)            Total inodes          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_node          
  *             Total number of inodes on local ephemeral storage. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/ephemeral_storage/total_bytes            GA             (project)            Total ephemeral storage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Total ephemeral storage bytes on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/ephemeral_storage/used_bytes            GA             (project)            Ephemeral storage usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Local ephemeral storage bytes used by the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/latencies/startup            BETA             (project)            Node startup latency          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, s              k8s_node          
  *             The total startup latency of the node, from GCE instance's CreationTimestamp to K8s node ready first time. Sampled every 60 seconds.              accelerator_family:              A classification of nodes based on hardware accelerators: gpu, tpu, cpu.              kube_control_plane_available:              Whether the node creation request was received when KCP (kube control plane) was available.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/logs/input_bytes            BETA             (project)            Logging throughput          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, INT64, By              k8s_node          
  *             Volume of log bytes generated on the node by user and system workloads. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              type:              Type is either 'system' or 'workload'. 'system' indicates the logging throughput of GKE system components. 'workload' indicates the throughput of logs generated by non-system containers running on user nodes.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/memory/allocatable_bytes            GA             (project)            Allocatable memory          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Number of bytes of memory that can be allocated for workloads on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/memory/allocatable_utilization            GA             (project)            Memory allocatable utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_node          
  *             The fraction of the allocatable memory that is currently in use on the instance. This value cannot exceed 1 as usage cannot exceed allocatable memory bytes. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.              component:              Name of the respective system daemon.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/memory/total_bytes            GA             (project)            Total memory          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Total number of bytes of memory on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/memory/used_bytes            GA             (project)            Memory usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Cumulative memory bytes used by the node. Sampled every 60 seconds.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/network/received_bytes_count            GA             (project)            Bytes received          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_node          
  *             Cumulative number of bytes received by the node over the network. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/network/sent_bytes_count            GA             (project)            Bytes transmitted          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_node          
  *             Cumulative number of bytes transmitted by the node over the network. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/pid_limit            GA             (project)            PID capacity          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_node          
  *             The max PID of OS on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/pid_used            GA             (project)            PID usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_node          
  *             The number of running process in the OS on the node. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node/status_condition            BETA             (project)            Kubernetes node status condition          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, BOOL, 1              k8s_node          
  *             Condition of a node from the node status condition field. Ready has `Unknown` status if the node controller has not heard from the node in the last `node-monitor-grace-period`. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              status:              Status of the condition. True, False, or Unknown.              condition:              The condition of the node.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node_daemon/cpu/core_usage_time            GA             (project)            CPU usage time          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, DOUBLE, s{CPU}              k8s_node          
  *             Cumulative CPU usage on all cores used by the node level system daemon in seconds. Sampled every 60 seconds.              component:              Name of the respective system daemon.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node_daemon/memory/used_bytes            GA             (project)            Memory usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_node          
  *             Memory usage by the system daemon in bytes. Sampled every 60 seconds.              component:              Name of the respective system daemon.              memory_type:              Either `evictable` or `non-evictable`. Evictable memory is memory that can be easily reclaimed by the kernel, while non-evictable memory cannot.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node_pool/multi_host/available            BETA             (project)            Kubernetes Multi-host TPU Node Pool Availability          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, BOOL, 1              k8s_node_pool          
  *             Whether or not the multi-host NodePool is available. Is True when all Nodes in the NodePool are available, and False if any of the Nodes in the NodePool are unavailable. Multi-host TPU node pool only. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             node_pool/status            BETA             (project)            Kubernetes Node Pool Status          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, BOOL, 1              k8s_node_pool          
  *             Current status of the NodePool from the NodePool instance. Status updates will happen after GKE API operations complete. Multi-host TPU node pool only. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              status:              Status of the nodepool.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/ephemeral_storage/used_bytes            BETA             (project)            Ephemeral pod storage usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_pod          
  *             Pod ephemeral storage usage in bytes. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/latencies/pod_first_ready            BETA             (project)            Pod first ready latency          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, s              k8s_pod          
  *             The Pod end-to-end startup latency (from Pod Created to Ready), including image pulls. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/network/policy_event_count            BETA             (project)            Network policy event count          
* Metric type Launch stage (Resource hierarchy levels)Display name:             DELTA, INT64, 1              k8s_pod          
  *             Change in the number of network policy events seen in the dataplane. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              verdict:              Policy verdict, possible values: [allow, deny].              workload_kind:              Kind of the workload, policy-enforced-pod belongs to, for example, "Deployment", "Replicaset", "StatefulSet", "DaemonSet", "Job" or "CronJob".              workload_name:              Name of the workload, policy-enforced-pod belongs to.              direction:              Direction of the traffic from the point of view of policy-enforced-pod, possible values: [ingress, egress].           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/network/received_bytes_count            GA             (project)            Bytes received          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_pod          
  *             Cumulative number of bytes received by the pod over the network. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/network/sent_bytes_count            GA             (project)            Bytes transmitted          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, By              k8s_pod          
  *             Cumulative number of bytes transmitted by the pod over the network. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/volume/total_bytes            GA             (project)            Volume capacity          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_pod          
  *             Total number of disk bytes available to the pod. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              volume_name:              The name of the volume (e.g. `/dev/sda1`).              persistentvolumeclaim_name:              The name of the referenced Persistent Volume Claim.              persistentvolumeclaim_namespace:              The namespace of the referenced Persistent Volume Claim.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/volume/used_bytes            GA             (project)            Volume usage          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, By              k8s_pod          
  *             Number of disk bytes used by the pod. Sampled every 60 seconds.              volume_name:              The name of the volume (e.g. `/dev/sda1`).              persistentvolumeclaim_name:              The name of the referenced Persistent Volume Claim.              persistentvolumeclaim_namespace:              The namespace of the referenced Persistent Volume Claim.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             pod/volume/utilization            GA             (project)            Volume utilization          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, DOUBLE, 1              k8s_pod          
  *             The fraction of the volume that is currently being used by the instance. This value cannot be greater than 1 as usage cannot exceed the total available volume space. Sampled every 60 seconds. After sampling, data is not visible for up to 120 seconds.              volume_name:              The name of the volume (e.g. `/dev/sda1`).              persistentvolumeclaim_name:              The name of the referenced Persistent Volume Claim.              persistentvolumeclaim_namespace:              The namespace of the referenced Persistent Volume Claim.           


### nginx

Metrics exported from the [NGINX Prometheus Exporter](https://github.com/nginxinc/nginx-prometheus-exporter#exported-metrics). Launch stages of these metrics: ALPHA

The "metric type" strings in this table must be prefixed with `kubernetes.io/nginx/`. That prefix has been omitted from the entries in the table. When querying a label, use the `metric.labels.` prefix; for example, `metric.labels.LABEL="VALUE"`.



* Metric type Launch stage (Resource hierarchy levels)Display name: Kind, Type, UnitMonitored resources
  * DescriptionLabels
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_accepted            ALPHA             (project)            Nginx connections_accepted          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, {connection}              k8s_container          
  *             Accepted client connections. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_active            ALPHA             (project)            Nginx connections_active          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, {connection}              k8s_container          
  *             Active client connections. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_handled            ALPHA             (project)            Nginx connections_handled          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, {connection}              k8s_container          
  *             Handled client connections. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_reading            ALPHA             (project)            Nginx connections_reading          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, {connection}              k8s_container          
  *             Connections where NGINX is reading the request header. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_waiting            ALPHA             (project)            Nginx connections_waiting          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, {connection}              k8s_container          
  *             Idle client connections. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             connections_writing            ALPHA             (project)            Nginx connections_writing          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, {connection}              k8s_container          
  *             Connections where NGINX is writing the response back to the client. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             http_requests_total            ALPHA             (project)            Nginx http_requests_total          
* Metric type Launch stage (Resource hierarchy levels)Display name:             CUMULATIVE, INT64, {request}              k8s_container          
  *             Total http requests. Sampled every 60 seconds.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             nginxexporter_build_info            ALPHA             (project)            Nginx nginxexporter_build_info          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_container          
  *             Exporter build information. Sampled every 60 seconds.              gitCommit:              Commit hash of the build which can be abbreviated.              version:              Build version.           
* Metric type Launch stage (Resource hierarchy levels)Display name:             up            ALPHA             (project)            Nginx up          
* Metric type Launch stage (Resource hierarchy levels)Display name:             GAUGE, INT64, 1              k8s_container          
  *             Status of the last metric scrape. Indicates if the server is up or not. Sampled every 60 seconds.           


Generated at 2025-03-06 15:20:27 UTC.