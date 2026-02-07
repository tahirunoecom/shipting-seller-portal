<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
//use App\Models\InboundOrder;
use App\Models\Wishlist;
use App\Models\Cart;
use App\Models\Driver;
use Illuminate\Support\Facades\Log;
use Config;
use Illuminate\Support\Facades\Storage;
use PDF;


class ScanSellc extends Controller
{

	public function validateBasicAuth($authHeader)
	{
		$header = explode(" ", $authHeader);
		$client_data = explode(":", base64_decode($header[1]));
		$client_id = $client_data[0];
		$client_secret = $client_data[1];
		$users = \DB::table('oauth_clients')->where(['id' => $client_id, 'secret' => $client_secret])->get()->toArray();
		if (!empty($users)) {
			return 1;
		}
		return 0;
	}



	public function getCategories(Request $request)
	{

		//DB::enableQueryLog(); 

		$query = DB::table('ai_category AS c');

		$query->select('c.id', 'c.name', 'c.image', 'c.status');
		$query->where([['c.status', '=', 1]]);
		$query->orderBy("c.code", "ASC");
		$getCategories = $query->get();

		//echo "<pre>"; print_r($getCategories); die;

		$getMasterProductOfCategory = array();

		$i = 0;
		foreach ($getCategories as $getCategory) {

			$ai_category_Id = $getCategory->id;

			$request->merge(['ai_category_id' => $ai_category_Id]);

			$namespace = 'App\Http\Controllers';
			$controllerproducts = app()->make($namespace . '\ScanSellc');

			//ThirdPartyOrderCount
			$getMasterProducts = $controllerproducts->callAction('getMasterProducts', [$request]);

			$getMasterProductsdata =  $getMasterProducts->original['data']['getMasterProducts'];


			$getMasterProductOfCategory[$i]['id'] = $getCategory->id;
			$getMasterProductOfCategory[$i]['name'] = $getCategory->name;
			$getMasterProductOfCategory[$i]['image'] = $getCategory->image;
			$getMasterProductOfCategory[$i]['status'] = $getCategory->status;



			$getMasterProductOfCategory[$i]['getMasterProductOfCategory'] = $getMasterProductsdata;

			$i++;
		}



		//dd(DB::getQueryLog()); // Show results of log

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getCategories' => $getMasterProductOfCategory
			]
		]);
	}

	public function getCategoryList(Request $request)
	{

		//DB::enableQueryLog(); 

		$query = DB::table('ai_category AS c');

		$query->select('c.id', 'c.name', 'c.image', 'c.status');
		$query->where([['c.status', '=', 1]]);
		$query->orderBy("c.code", "ASC");
		$getCategories = $query->get();

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getCategories' => $getCategories
			]
		]);
	}
	
		public function addSubcategory(Request $request)
	{
		$wh_account_id = $request->wh_account_id;
		$category_id = $request->category_id;
		$name = $request->name;

		// Validate required fields
		if (empty($wh_account_id) || empty($category_id) || empty($name)) {
			return response()->json([
				'status' => 0,
				'message' => 'Missing required fields',
				'data' => []
			]);
		}

		// Check if subcategory already exists
		$existing = DB::table('wh_subcategories')
			->where('wh_account_id', $wh_account_id)
			->where('category_id', $category_id)
			->where('name', $name)
			->first();

		if ($existing) {
			return response()->json([
				'status' => 0,
				'message' => 'Subcategory already exists',
				'data' => []
			]);
		}

		// Insert subcategory
		$subcategory_id = DB::table('wh_subcategories')->insertGetId([
			'wh_account_id' => $wh_account_id,
			'category_id' => $category_id,
			'name' => $name,
			'status' => 'Y',
			'created_at' => now(),
			'updated_at' => now()
		]);

		return response()->json([
			'status' => 1,
			'message' => 'Subcategory added successfully',
			'data' => [
				'subcategory' => [
					'id' => $subcategory_id,
					'name' => $name
				]
			]
		]);
	}

	// Get Subcategories
	public function getSubcategories(Request $request)
	{
		$wh_account_id = $request->wh_account_id;
		$category_id = $request->category_id;

		// Validate required fields
		if (empty($category_id)) {
			return response()->json([
				'status' => 0,
				'message' => 'Category ID is required',
				'data' => []
			]);
		}

		// Build query
		$query = DB::table('wh_subcategories')
			->where('category_id', $category_id)
			->where('status', 'Y');

		// If wh_account_id provided, filter by it
		if (!empty($wh_account_id)) {
			$query->where('wh_account_id', $wh_account_id);
		}

		$subcategories = $query->select('id', 'name')->get();

		return response()->json([
			'status' => 1,
			'message' => 'Subcategories fetched successfully',
			'data' => [
				'subcategories' => $subcategories
			]
		]);
	}

	
	public function verifyUPC(Request $request)
	{
		//echo "<pre>"; print_r($request);
		$wh_account_id = $request->wh_account_id;
		$upc = $request->upc;

		if ($wh_account_id == "" || $upc == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id or UPC can not be Empty',
				'data' => [
					'verifyUPC' => 0
				]
			]);
		}

		$namespace = 'App\Http\Controllers';
		$controllerproducts = app()->make($namespace . '\ScanSellc');

		//ThirdPartyOrderCount
		$getSellerProducts = $controllerproducts->callAction('getSellerProducts', [$request]);

		$getSellerProductsdata =  $getSellerProducts->original['data']['getSellerProducts'];

		//echo "<pre>"; print_r($getSellerProductsdata); die;

		if (!isset($getSellerProductsdata->upc)) {
			//Product is not available in our DB;

			// run api to get UPC Details... 

			$upcItemDb = $this->upcItemDb($upc);

			if ($upcItemDb != false) {

				$total = $upcItemDb->total;

				if ($total > 0) {

					$items = $upcItemDb->items;

					$title = $getSellerProductsdata['title'] = $items[0]->title;
					$ean = $items[0]->ean;
					$description = $items[0]->description;
					$upc = $getSellerProductsdata['upc'] = $items[0]->upc;
					$brand = $getSellerProductsdata['brand'] =  $items[0]->brand;
					$model = $items[0]->model;
					$color = $items[0]->color;
					$size = $items[0]->size;
					$dimension = $items[0]->dimension;
					$weight = $items[0]->weight;
					$category = $items[0]->category;
					if (isset($items[0]->currency)) {
						$currency = $items[0]->currency;
					} else {
						$currency = "";
					}

					$lowest_recorded_price =  $getSellerProductsdata['lowest_recorded_price'] = $items[0]->lowest_recorded_price;
					$highest_recorded_price =  $getSellerProductsdata['highest_recorded_price'] = $items[0]->highest_recorded_price;

					if (isset($items[0]->images[0])) {
						$images = $items[0]->images[0];
					} else {
						$images = "";
					}

					$getSellerProductsdata['images'] = $images;

					$insertProduct = DB::table('ai_product')->insertGetId(
						[
							'upc' => $upc,
							'title' => $title,
							'ean' => $ean,
							'description' => $description,
							'brand' => $brand,
							'model' => $model,
							'color' => $color,
							'size' => $size,
							'dimension' => $dimension,
							'weight' => $weight,
							'category' => $category,
							'currency' => $currency,
							'lowest_recorded_price' => $lowest_recorded_price,
							'highest_recorded_price' => $highest_recorded_price,
							'images' => $images

						]
					);


					return response()->json([
						'status' => 1,
						'code' => 200,
						'message' => 'Verified',
						'data' => [
							'verifyUPC' => 1,
							'ItemDetail' => $getSellerProductsdata
						]
					]);
				} else {
					return response()->json([
						'status' => 0,
						'code' => 403,
						'message' => 'UPC is not available!',
						'data' => [
							'verifyUPC' => 0
						]
					]);
				}
			} else {
				return response()->json([
					'status' => 0,
					'code' => 403,
					'message' => 'UPC is not available!',
					'data' => [
						'verifyUPC' => 0
					]
				]);
			}
		} else {
			$getSellerProductsdata1['title'] = $getSellerProductsdata->title;
			$getSellerProductsdata1['upc'] = $getSellerProductsdata->upc;
			$getSellerProductsdata1['brand'] = $getSellerProductsdata->brand;
			$getSellerProductsdata1['images'] = $getSellerProductsdata->images;
			$getSellerProductsdata1['lowest_recorded_price'] = $getSellerProductsdata->lowest_recorded_price;
			$getSellerProductsdata1['highest_recorded_price'] = $getSellerProductsdata->highest_recorded_price;



			if ($wh_account_id != "") {
				//check this upc is with given wh_account_id  

				$getShipperProducts = $controllerproducts->callAction('getShipperProducts', [$request]);

				$getShipperProductsdata =  $getShipperProducts->original['data']['getSellerProducts'];

				//echo "<pre>"; print_r($getShipperProducts);

			}

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Verified',
				'data' => [
					'verifyUPC' => 1,
					'ItemDetail' => $getSellerProductsdata1,
					'getShipperProductsdata' => (object)$getShipperProductsdata
				]
			]);
		}
	}

	public function getSellerProducts(Request $request)
	{
		// To get product list of all sellers

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->oc_product_id)) {
			$oc_product_id = $request->oc_product_id;
		} else {
			$oc_product_id = "";
		}
		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select('p.*');
		///->join('wh_product AS wp', 'wp.oc_product_id', '=', 'p.product_id')

		if ($upc) {
			$query->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($oc_product_id) {
			$query->where([
				['p.ai_product_id', '=', $oc_product_id]
			]);
		}

		$query->offset(0);
		$query->limit(20);

		if ($oc_product_id || $upc) {

			$getSellerProducts = $query->get()->first();
		} else {
			$getSellerProducts = $query->get();
		}

		//dd(DB::getQueryLog()); // Show results of log

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getSellerProducts' => $getSellerProducts
			]
		]);
	}

	public function generateUPC($productCode)
	{
		// Check if the product code is 12 digits long.

		if (strlen($productCode) != 12) {
			return false;
		}

		// Generate the check digit.
		$checkDigit = 0;
		for ($i = 0; $i < 11; $i++) {
			$checkDigit += $productCode[$i] * (11 - $i);
		}
		$checkDigit = 10 - $checkDigit % 10;

		// Return the UPC code.
		return $productCode . $checkDigit;
	}

	public function addProductsToShipper(Request $request)
	{
		//echo "<pre>"; print_r($request->all()); die;
		$wh_account_id = $request->wh_account_id;
		$upc = $request->upc;
		$product_type = "AI";

		//$quantity = $request->quantity; 
		
		if (isset($request->subcategory_id)) {
			$subcategory_id = $request->subcategory_id;
		} else {
			$subcategory_id = "";
		}
		
		if (isset($request->shipper_product_id)) {
			$shipper_product_id = $request->shipper_product_id;
		} else {
			$shipper_product_id = "";
		}

		if (isset($request->quantity)) {
			$quantity = $request->quantity;
		} else {
			$quantity = 0;
		}

		if (isset($request->servicetiming)) {
			$servicetiming = $request->servicetiming;
		} else {
			$servicetiming = 0;
		}

		$ai_category_id = $request->ai_category_id;

		if ($ai_category_id == 16) {
			//restaurant category
			$timeNum = time();
			$randmNum = "96";
			$productCode = $timeNum . $randmNum;
			$upc = $this->generateUPC($productCode);
		}

		if ($wh_account_id == "" || $upc == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id or UPC can not be Empty',
				'data' => [
					'addProductsToShipper' => 0
				]
			]);
		}


		$price = $request->price;

		$product_status = $request->product_status;   //Y,N
		if (isset($request->is_manual)) {
			$is_manual = $request->is_manual;   //Y,N
		} else {
			$is_manual = "";
		}

		if (isset($request->discount)) {
			$discount = $request->discount;   //Y,N
		} else {
			$discount = "";
		}

		if (($is_manual != "") && ($shipper_product_id == "")) {
			//add product manualy

			//echo "is manual";

			if (isset($request->product_type)) {
				$product_condition = $request->product_type;
			} else {
				$product_condition = "";
			}

			$upc = $upc;
			//$ai_product_id = ""; // add this upc in ai_product and get ai_product id 

			if (isset($request->title)) {
				$title = $request->title;
			} else {
				$title = "";
			}

			if (isset($request->event_title)) {
				$event_title = $request->event_title;
			} else {
				$event_title = "";
			}

			if (isset($request->event_description)) {
				$event_description = $request->event_description;
			} else {
				$event_description = "";
			}

			if (isset($request->ean)) {
				$ean = $request->ean;
			} else {
				$ean = "";
			}

			if (isset($request->description)) {
				$description = $request->description;
			} else {
				$description = "";
			}

			if (isset($request->brand)) {
				$brand = $request->brand;
			} else {
				$brand = "";
			}

			if (isset($request->model)) {
				$model = $request->model;
			} else {
				$model = "";
			}

			if (isset($request->color)) {
				$color = $request->color;
			} else {
				$color = "";
			}

			if (isset($request->size)) {
				$size = $request->size;
			} else {
				$size = "";
			}

			if (isset($request->dimension)) {
				$dimension = $request->dimension;
			} else {
				$dimension = "";
			}

			if (isset($request->weight)) {
				$weight = $request->weight;
			} else {
				$weight = "";
			}

			if (isset($request->category)) {
				$category = $request->category;
			} else {
				$category = "";
			}

			if (isset($request->currency)) {
				$currency = $request->currency;
			} else {
				$currency = "";
			}

			if (isset($request->event_location_id)) {
				$event_location = $request->event_location_id;
			} else {
				$event_location = "";
			}

			if (isset($request->event_date_time)) {
				$event_date_time = $request->event_date_time;
			} else {
				$event_date_time = "";
			}

			if (isset($request->product_save_type)) {
				$product_save_type = $request->product_save_type;
				if ($product_save_type == 'serviceproduct') {
					$product_save_value = "Service";
				} else {
					$product_save_value = "AI";
				}
			} else {
				$product_save_type = "";
				$product_save_value = "AI";
			}

			$lowest_recorded_price = $price;
			$highest_recorded_price = $price;
			//$images = $request->images; 

			if (isset($request->environment)) {
				$environment = $request->environment;
			} else {
				$environment = "";
			}

			if ($environment == 'web') {
				$images = $request->file;
			} else {

				$file = $request->file('file');
				if (!empty($file)) {
					$filename = time() . $file->getClientOriginalName();
					$extension = $file->getClientOriginalExtension();
					$fileSize = $file->getSize();
					//$valid_extension = array("csv");
					$maxFileSize = 12097152;

					if ($fileSize <= $maxFileSize) {
						$location = 'ProductImagesUpload/' . $request->wh_account_id;
						$file->move($location, $filename);
						$filePath = public_path($location . "/" . $filename);
						$images = "https://stageshipperapi.thedelivio.com//" . $location . "/" . $filename;
					} else {

						return response()->json([
							'status' => 0,
							'code' => 405,
							'message' => 'File is not uploaded due to big size',
							'data' => [
								'addProductsToShipper' => 0
							]
						]);
					}
				} else {
					$images = "";
				}
			}


			if (isset($request->product_varaitions)) {

				$product_varaitions = $request->product_varaitions;
				if ($product_varaitions == 'Yes') {

					if (isset($request->variation_name_value)) {
						$variation_name_value = $request->variation_name_value;
					} else {
						$variation_name_value = "";
					}

					if (isset($request->variation_location)) {
						$variation_location = $request->variation_location;
					} else {
						$variation_location = "";
					}

					if (isset($request->variation_datetime)) {
						$variation_datetime = $request->variation_datetime;
					} else {
						$variation_datetime = "";
					}

					if (isset($request->parent_product_id)) {
						$parent_product_id = $request->parent_product_id;
					} else {
						$parent_product_id = "";
					}

					$product_varaitions = 'Y';
					$variation_type = 'Child';
					if (isset($request->variation_category_name)) {
						$variation_category_name = $request->variation_category_name; //Size, Color     
					} else {
						$variation_category_name = "";
					}

					$variation_name_value = $variation_name_value; //red,blue,L,M,XL 


					if (isset($request->variation_parent_start)) {
						$variation_parent_start = $request->variation_parent_start;

						if ($variation_parent_start == 'Y') {

							$parent_product_id = DB::table('wh_producttoshipper_parent')->insertGetId(
								[
									'parent_title' => $event_title,
									'parent_description' => $event_description,
									'parent_variation_type' => 'Parent',
									'child_products' => '',
									'parent_image' => $images,
									'parent_product_status' => $product_status
								]
							);

							$variatio_validation = 'varaition enabled';
						}
					}
				} else {
					$parent_product_id = '';
					$product_varaitions = 'N';
					$variation_type = '';
					$variation_category_name = '';
					$variation_name_value = '';
					$variation_location = $event_location;
					$variation_datetime = $event_date_time;
				}
			} else {
				$parent_product_id = '';
				$product_varaitions = 'N';
				$variation_category_name = '';
				$variation_name_value = '';
				$variation_type = '';
				$variation_location = $event_location;
				$variation_datetime = $event_date_time;
			}

			// add this product to our DB and assign this product to shipper

			$ai_product_id = DB::table('ai_product')->insertGetId(
				[
					'upc' => $upc,
					'title' => $title,
					'ean' => $ean,
					'description' => $description,
					'brand' => $brand,
					'model' => $model,
					'color' => $color,
					'size' => $size,
					'dimension' => $dimension,
					'weight' => $weight,
					'category' => $category,
					'currency' => $currency,
					'lowest_recorded_price' => $lowest_recorded_price,
					'highest_recorded_price' => $highest_recorded_price,
					'images' => $images

				]
			);

			$child_product_id = DB::table('wh_producttoshipper')->insertGetId(
				[
					'wh_account_id' => $wh_account_id,
					'seller_id' => "",
					'ai_product_id' => $ai_product_id,
					//'sku' => $sku, 
					'upc' => $upc,
					'image' => $images,
					'title' => $title,
					'description' => $description,
					'price' => $price,
					'ai_category_id' => $ai_category_id,
					'discount' => $discount,
					'radius' => "",
					'product_type' => $product_type,
					'product_condition' => $product_condition,
					'servicetiming' => $servicetiming,
					'quantity' => $quantity,
					'subcategory_id' => $subcategory_id,
					'status' => $product_status,
					'product_type' => $product_save_value,
					'variation_type' => $variation_type,
					'parent_product_id' => $parent_product_id,
					'variation_category_name' => $variation_category_name,
					'variation_name_value' => $variation_name_value,
					'event_location' => $variation_location,
					'event_date_time' => $variation_datetime

				]
			);

			//add service provuder
			if ($product_save_value == 'Service') {
				$selectedserviceprovider = $request->serviceprovider;

				foreach ($selectedserviceprovider as $serviceprovider_id) {

					$wh_provider_service_conn_id = DB::table('wh_provider_service_conn')->insertGetId(
						[
							'wh_account_id' => $wh_account_id,
							'serviceprovider_id' => $serviceprovider_id,
							'product_id' => $child_product_id

						]
					);
				}
			}

			$return_data_val = array("parent_product_id" => $parent_product_id, "child_product_id" => $child_product_id);
			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Product uploaded successfully',
				'data' => [
					'addProductsToShipper' => 1,
					'data_val' => $return_data_val
				]
			]);
		}

		if ($shipper_product_id == "") {

			//add product

			$namespace = 'App\Http\Controllers';
			$controllerproducts = app()->make($namespace . '\ScanSellc');

			//ThirdPartyOrderCount
			$getSellerProducts = $controllerproducts->callAction('getSellerProducts', [$request]);

			$getSellerProductsdata =  $getSellerProducts->original['data']['getSellerProducts'];

			if (!isset($getSellerProductsdata->upc)) {
				//Product is not available in our DB;

				// run api to get UPC Details... 

				$upcItemDb = $this->upcItemDb($upc);

				if ($upcItemDb != false) {

					$total = $upcItemDb->total;

					if ($total > 0) {

						$items = $upcItemDb->items;
						$title = $items[0]->title;
						$ean = $items[0]->ean;
						$description = $items[0]->description;

						if (!isset($items[0]->upc)) {
							$upc = $items[0]->ean;
						}

						if (!isset($items[0]->brand)) {
							$brand = '';
						} else {
							$brand = $items[0]->brand;
						}

						if (!isset($items[0]->model)) {
							$model = '';
						} else {
							$model = $items[0]->model;
						}

						if (!isset($items[0]->color)) {
							$color = '';
						} else {
							$color = $items[0]->color;
						}

						if (!isset($items[0]->size)) {
							$size = '';
						} else {
							$size = $items[0]->size;
						}
						if (!isset($items[0]->dimension)) {
							$dimension = '';
						} else {
							$dimension = $items[0]->dimension;
						}
						$weight = $items[0]->weight;
						if (!isset($items[0]->category)) {
							$category = '';
						} else {
							$category = $items[0]->category;
						}
						if (!isset($items[0]->currency)) {
							$currency = '';
						} else {
							$currency = $items[0]->currency;
						}
						$lowest_recorded_price = $items[0]->lowest_recorded_price;
						$highest_recorded_price = $items[0]->highest_recorded_price;
						$images = $items[0]->images[0];

						// add this product to our DB and assign this product to shipper

						$ai_product_id = DB::table('ai_product')->insertGetId(
							[
								'upc' => $upc,
								'title' => $title,
								'ean' => $ean,
								'description' => $description,
								'brand' => $brand,
								'model' => $model,
								'color' => $color,
								'size' => $size,
								'dimension' => $dimension,
								'weight' => $weight,
								'category' => $category,
								'currency' => $currency,
								'lowest_recorded_price' => $lowest_recorded_price,
								'highest_recorded_price' => $highest_recorded_price,
								'images' => $images

							]
						);
					} else {

						return response()->json([
							'status' => 0,
							'code' => 403,
							'message' => 'UPC is not valid',
							'data' => [
								'addProductsToShipper' => 0
							]
						]);
					}
				} else {

					return response()->json([
						'status' => 0,
						'code' => 403,
						'message' => 'UPC is not valid',
						'data' => [
							'addProductsToShipper' => 0
						]
					]);
				}
			} else {

				$ai_product_id = $getSellerProductsdata->ai_product_id;
				$subcategory_id = $getSellerProductsdata->subcategory_id;
				$title = $getSellerProductsdata->title;
				$ean = $getSellerProductsdata->ean;
				$description = $getSellerProductsdata->description;
				$upc = $getSellerProductsdata->upc;
				$brand = $getSellerProductsdata->brand;
				$model = $getSellerProductsdata->model;
				$color = $getSellerProductsdata->color;
				$size = $getSellerProductsdata->size;
				$dimension = $getSellerProductsdata->dimension;
				$weight = $getSellerProductsdata->weight;
				$category = $getSellerProductsdata->category;
				$currency = $getSellerProductsdata->currency;
				$lowest_recorded_price = $getSellerProductsdata->lowest_recorded_price;
				$highest_recorded_price = $getSellerProductsdata->highest_recorded_price;
				$images = $getSellerProductsdata->images;
			}

			$wh_producttoshipperCheck = DB::table('wh_producttoshipper AS a')

				->select('a.id as id')
				->where([
					['a.wh_account_id', '=', $wh_account_id],
					['a.ai_product_id', '=', $ai_product_id]
				])

				->get()->first();

			if (isset($wh_producttoshipperCheck->id)) {
				$id = $wh_producttoshipperCheck->id;
			} else {
				$id = "";
			}


			if ($id) {

				return response()->json([
					'status' => 0,
					'code' => 403,
					'message' => 'Product already exists',
					'data' => [
						'addProductsToShipper' => 0
					]
				]);
			} else {

				$price = $request->price;
				$ai_category_id = $request->ai_category_id;
				//$quantity = $request->quantity;
				if (isset($request->radius)) {
					$radius = $request->radius;
				} else {
					$radius = "";
				}

				if (isset($request->product_type)) {
					$product_condition = $request->product_type;
				} else {
					$product_condition = "";
				}


				//upload image

				if (is_dir('ProductImagesUpload/' . $request->wh_account_id) === false) {
					mkdir('ProductImagesUpload/' . $request->wh_account_id);
				}

				$file = $request->file('images');
				if (!empty($file)) {
					$filename = time() . $file->getClientOriginalName();
					$extension = $file->getClientOriginalExtension();
					$fileSize = $file->getSize();
					//$valid_extension = array("csv");
					$maxFileSize = 2097152;

					if ($fileSize <= $maxFileSize) {
						$location = 'ProductImagesUpload/' . $request->wh_account_id;
						$file->move($location, $filename);
						$filePath = public_path($location . "/" . $filename);
						$images = "https://stageshipperapi.thedelivio.com//" . $location . "/" . $filename;
					} else {

						return response()->json([
							'status' => 0,
							'code' => 405,
							'message' => 'File is not uploaded due to big size',
							'data' => [
								'addProductsToShipper' => 0
							]
						]);
					}
				} else {
					$images = $images;
				}



				$discount = $request->discount;

				$insert = DB::table('wh_producttoshipper')->insertGetId(
					[
						'wh_account_id' => $wh_account_id,
						'seller_id' => "",
						'ai_product_id' => $ai_product_id,
						//'sku' => $sku, 
						'upc' => $upc,
						'image' => $images,
						'title' => $title,
						'subcategory_id' => $subcategory_id,
						'description' => $description,
						'price' => $price,
						'servicetiming' => $servicetiming,
						'ai_category_id' => $ai_category_id,
						'discount' => $discount,
						'radius' => $radius,
						'product_type' => $product_type,
						'product_condition' => $product_condition,
						'quantity' => $quantity,
						'status' => $product_status

					]
				);

				return response()->json([
					'status' => 1,
					'code' => 200,
					'message' => 'Product uploaded successfully',
					'data' => [
						'addProductsToShipper' => 1
					]
				]);
			}
		} else {

			//edit the product

			if (isset($request->product_type)) {
				$product_condition = $request->product_type;
			} else {
				$product_condition = "";
			}

			if (isset($request->variation_category_name)) {
				$variation_category_name = $request->variation_category_name;
			} else {
				$variation_category_name = "";
			}
			if (isset($request->variation_name_value)) {
				$variation_name_value = $request->variation_name_value;
			} else {
				$variation_name_value = "";
			}
			if (isset($request->event_location)) {
				$event_location = $request->event_location;
			} else {
				$event_location = "";
			}
			if (isset($request->event_date_time)) {
				$event_date_time = $request->event_date_time;
			} else {
				$event_date_time = "";
			}

			if (isset($request->environment)) {
				$environment = $request->environment;
			} else {
				$environment = "";
			}

			if (!isset($request->parent_product_id)) {

				if ($environment == 'web') {
					$images = $request->file;
				} else {

					$file = $request->file('file');
					if (!empty($file)) {
						$filename = time() . $file->getClientOriginalName();
						$extension = $file->getClientOriginalExtension();
						$fileSize = $file->getSize();
						//$valid_extension = array("csv");
						$maxFileSize = 12097152;

						if ($fileSize <= $maxFileSize) {
							$location = 'ProductImagesUpload/' . $request->wh_account_id;
							$file->move($location, $filename);
							$filePath = public_path($location . "/" . $filename);
							$images = "https://stageshipperapi.thedelivio.com//" . $location . "/" . $filename;
						} else {

							return response()->json([
								'status' => 0,
								'code' => 405,
								'message' => 'File is not uploaded due to big size',
								'data' => [
									'addProductsToShipper' => 0
								]
							]);
						}
					} else {
						$images = "";
					}
				}
			} else {
				$images = $request->imagepath;
			}
			//echo "<pre>"; print_r($request->all()); die;

			$wh_producttoshipperCheck = DB::table('wh_producttoshipper AS a')

				->select('a.id as id')
				->where([
					['a.wh_account_id', '=', $wh_account_id],
					['a.id', '=', $shipper_product_id]
				])

				->get()->first();

			if (isset($wh_producttoshipperCheck->id)) {
				$id = $wh_producttoshipperCheck->id;
			} else {
				$id = "";
			}


			if (!$id) {

				return response()->json([
					'status' => 0,
					'code' => 403,
					'message' => 'Wrong Product',
					'data' => [
						'addProductsToShipper' => 0
					]
				]);
			} else {

				if ($images == "") {
					$affected1 = DB::table('wh_producttoshipper')
						->where('id', $id)
						->update(
							[

								'price' => $price,
								'ai_category_id' => $ai_category_id,
								'subcategory_id' => $subcategory_id,
								'discount' => $discount,
								'quantity' => $quantity,
								'product_condition' => $product_condition,
								'variation_category_name' => $variation_category_name,
								'variation_name_value' => $variation_name_value,
								'event_location' => $event_location,
								'event_date_time' => $event_date_time,
								'ordered_qty' => 0,
								'status' => $product_status
							]
						);
				} else {

					$affected1 = DB::table('wh_producttoshipper')
						->where('id', $id)
						->update(
							[

								'price' => $price,
								'ai_category_id' => $ai_category_id,
								'subcategory_id' => $subcategory_id,
								'discount' => $discount,
								'servicetiming' => $servicetiming,
								'quantity' => $quantity,
								'product_condition' => $product_condition,
								'image' => $images,
								'variation_category_name' => $variation_category_name,
								'variation_name_value' => $variation_name_value,
								'event_location' => $event_location,
								'event_date_time' => $event_date_time,
								'ordered_qty' => 0,
								'status' => $product_status
							]
						);
				}



				return response()->json([
					'status' => 1,
					'code' => 200,
					'message' => 'Product updated successfully',
					'data' => [
						'addProductsToShipper' => 1
					]
				]);
			}
		}
	}

	public function updateCompanyIcon(Request $request)
	{

		if (isset($request->warehouse_user_id)) {
			$warehouse_user_id = $request->warehouse_user_id;
		} else if (isset($request->wh_account_id)) {
			$wh_account_id = $request->wh_account_id;

			$this->db = DB::table('wh_warehouse_user as u');
			$this->db->select(["u.id as warehouse_user_id", "u.wh_account_id"]);
			$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
			$this->db->where(['u.wh_account_id' => $wh_account_id]);
			$storename1 = $this->db->get()->first();

			if (isset($storename1->warehouse_user_id)) {
				$warehouse_user_id = $storename1->warehouse_user_id;
			} else {
				$warehouse_user_id = '';
			}
		} else {
			$warehouse_user_id = '';
		}
		if (!empty($warehouse_user_id)) {
			$company_icon_file = $request->file('company_icon');
			if (!empty($company_icon_file)) {
				$company_icon = $request->file('company_icon')->store('apiDocs/company_icon', 'public');
			} else {
				$company_icon = '';
			}

			if (!empty($company_icon)) {
				$affected2 = DB::table('wh_warehouse_user_address')
					->where('warehouse_user_id', $warehouse_user_id)

					->update(
						[

							'company_icon' => '' . $company_icon . ''


						]
					);

				return response()->json([
					'status' => 1,
					'code' => 200,
					'message' => 'icon updated',
					'data' => [
						'updateCompanyIcon' => 1
					]
				]);
			} else {
				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'company_icon not avaiable',
					'data' => [
						'updateCompanyIcon' => 0
					]
				]);
			}
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'warehouse_user_id not avaiable',
				'data' => [
					'updateCompanyIcon' => 0
				]
			]);
		}
	}

	public function EditProductsToShipper(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$shipper_product_id = $request->shipper_product_id;
		$price = $request->price;
		$ai_category_id = $request->ai_category_id;
		$quantity = $request->quantity;
		$discount = $request->discount;

		if ($wh_account_id == "" || $shipper_product_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id or Product Id can not be Empty',
				'data' => [
					'EditProductsToShipper' => 0
				]
			]);
		}


		$wh_producttoshipperCheck = DB::table('wh_producttoshipper AS a')

			->select('a.id as id')
			->where([
				['a.wh_account_id', '=', $wh_account_id],
				['a.id', '=', $shipper_product_id]
			])

			->get()->first();

		if (isset($wh_producttoshipperCheck->id)) {
			$id = $wh_producttoshipperCheck->id;
		} else {
			$id = "";
		}


		if (!$id) {

			return response()->json([
				'status' => 0,
				'code' => 403,
				'message' => 'Wrong Product',
				'data' => [
					'EditProductsToShipper' => 0
				]
			]);
		} else {

			$affected1 = DB::table('wh_producttoshipper')
				->where('id', $id)
				->update(
					[

						'price' => $price,
						'ai_category_id' => $ai_category_id,
						'discount' => $discount,
						'quantity' => $quantity,
						'ordered_qty' => 0
					]
				);



			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Product updated successfully',
				'data' => [
					'EditProductsToShipper' => 1
				]
			]);
		}
	}

	public function ToggleProductsToShipper(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$shipper_product_id = $request->shipper_product_id;
		$product_status = $request->product_status;   //Y,N

		if ($wh_account_id == "" || $shipper_product_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id or Product Id can not be Empty',
				'data' => [
					'ToggleProductsToShipper' => 0
				]
			]);
		}

		$wh_producttoshipperCheck = DB::table('wh_producttoshipper AS a')

			->select('a.id as id')
			->where([
				['a.wh_account_id', '=', $wh_account_id],
				['a.id', '=', $shipper_product_id]
			])

			->get()->first();

		if (isset($wh_producttoshipperCheck->id)) {
			$id = $wh_producttoshipperCheck->id;
		} else {
			$id = "";
		}

		if (!$id) {

			return response()->json([
				'status' => 0,
				'code' => 403,
				'message' => 'Wrong Product',
				'data' => [
					'ToggleProductsToShipper' => 0
				]
			]);
		} else {

			$affected1 = DB::table('wh_producttoshipper')
				->where('id', $id)
				->update(
					[
						'status' => $product_status
					]
				);



			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Product status updated successfully',
				'data' => [
					'ToggleProductsToShipper' => 1
				]
			]);
		}
	}

	public function upcItemDb($upc)
	{

		$user_key = '224016392212';
		$endpoint = 'https://api.upcitemdb.com/prod/v1/lookup';
		$endpoint = 'https://api.upcitemdb.com/prod/trial/lookup';

		$ch = curl_init();
		/* if your client is old and doesn't have our CA certs*/
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
		curl_setopt($ch, CURLOPT_ENCODING, '');
		curl_setopt($ch, CURLOPT_HTTPHEADER, array(
			"user_key: $user_key",
			"key_type: 3scale",
			"Accept: application/json",
			"Accept-Encoding: gzip,deflate"
		));

		// HTTP GET
		curl_setopt($ch, CURLOPT_POST, 0);
		curl_setopt($ch, CURLOPT_URL, $endpoint . '?upc=' . $upc);
		$response = curl_exec($ch);
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		if ($httpcode != 200) {
			// echo "error status $httpcode...\n";
			return false;
		} else {
			//$response."\n";
			return $str = json_decode($response);
		}
		//echo "<pre>";



		//$response = unserialize(urldecode($str));


		//echo "<pre>";
		//print_r($str);
		/* if you need to run more queries, do them in the same connection.
		 * use rawurlencode() instead of URLEncode(), if you set search string
		 * as url query param
		 * for search requests, change to sleep(6)
		 */
		//sleep(2);
		// proceed with other queries
		curl_close($ch);

		//return $response;


	}

	public function addBulkProductsToShipper(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		if (is_dir('ShippperBulkProduct/' . $request->wh_account_id) === false) {
			mkdir('ShippperBulkProduct/' . $request->wh_account_id);
		}

		$file = $request->file('fileUpload');
		if (!empty($file)) {
			$filename = time() . $file->getClientOriginalName();
			$extension = $file->getClientOriginalExtension();
			$fileSize = $file->getSize();
			//$valid_extension = array("csv");
			$maxFileSize = 2097152;

			if ($fileSize <= $maxFileSize) {
				$location = 'ShippperBulkProduct/' . $request->wh_account_id;
				$file->move($location, $filename);
				$filepath = public_path($location . "/" . $filename);

				$remark = "File Uploaded";
				$status = 1;
				$date = date('Y-m-d H:i:s');

				$file_id = DB::table('ai_bulk_product_upload_file')->insertGetId(
					[
						'wh_account_id' => $wh_account_id,
						'filename' => $filename,
						'filepath' => $filepath,
						'remark' => $remark,
						'status' => $status,
						'upload_date' => $date

					]
				);
			} else {
				$remark = "File is not uploaded due to big size";
				$status = 0;
				$date = date('Y-m-d H:i:s');
				$file_id = DB::table('ai_bulk_product_upload_file')->insertGetId(
					[
						'wh_account_id' => $wh_account_id,
						'filename' => $filename,
						'filepath' => $filepath,
						'remark' => $remark,
						'status' => $status,
						'upload_date' => $date

					]
				);

				return response()->json([
					'status' => 0,
					'code' => 403,
					'message' => 'File is not uploaded due to big size',
					'data' => [
						'addBulkProductsToShipper' => 0
					]
				]);
			}
		} else {
			$remark = "File is not uploaded something went wrong";
			$status = 0;
			$date = date('Y-m-d H:i:s');
			$file_id = DB::table('ai_bulk_product_upload_file')->insertGetId(
				[
					'wh_account_id' => $wh_account_id,
					'filename' => "NA",
					'filepath' => "NA",
					'remark' => $remark,
					'status' => $status,
					'upload_date' => $date

				]
			);
			return response()->json([
				'status' => 0,
				'code' => 403,
				'message' => 'File is not uploaded something went wrong',
				'data' => [
					'addBulkProductsToShipper' => 0
				]
			]);
		}

		$csv = array_map('str_getcsv', file($filepath));

		$i = 0;
		foreach ($csv as $product) {
			if ($i != 0) {
				$upc = $product[0];

				if ($upc != '') {

					$request1 = new \Illuminate\Http\Request();

					$request1->replace(['wh_account_id' => $wh_account_id, 'upc' => $upc]);

					$namespace = 'App\Http\Controllers';
					$controllerproducts = app()->make($namespace . '\ScanSellc');

					//ThirdPartyOrderCount
					$verifyUPC = $controllerproducts->callAction('verifyUPC', [$request1]);

					//echo "<pre>"; print_r($verifyUPC);
					$verifyUPCdata =  $verifyUPC->original;

					//echo "<pre>"; print_r($verifyUPCdata);

					if ($verifyUPCdata['status'] == 1) {
						//add product
						$ai_category_id = $product[1];
						$price = $product[2];
						$discount = $product[3];
						$quantity = $product[4];

						if ($ai_category_id && $price && $discount && $quantity) {

							// check category id is correct or not

							$ai_categoryCheck = DB::table('ai_category AS a')

								->select('a.id as id')
								->where([
									['a.id', '=', $ai_category_id]
								])

								->get()->first();

							if (isset($ai_categoryCheck->id)) {
								$id = $ai_categoryCheck->id;



								$request2 = new \Illuminate\Http\Request();

								$request2->replace(['wh_account_id' => $wh_account_id, 'upc' => $upc]);

								$request2->replace(['wh_account_id' => $wh_account_id, 'upc' => $upc, 'ai_category_id' => $ai_category_id, 'price' => $price, 'discount' => $discount, 'quantity' => $quantity]);


								$addProductsToShipper = $controllerproducts->callAction('addProductsToShipper', [$request2]);

								$addProductsToShipperResponse =  $addProductsToShipper->original;


								//echo "<pre>"; print_r($addProductsToShipperResponse);

								if ($addProductsToShipperResponse['status'] != 0) {

									$remark = $addProductsToShipperResponse['message'];
									$status = 1;
									$date = date('Y-m-d H:i:s');

									$insert = DB::table('ai_bulk_product_list')->insertGetId(
										[
											'wh_account_id' => $wh_account_id,
											'file_id' => $file_id,
											'upc' => $upc,
											'remark' => $remark,
											'status' => $status,
											'upload_date' => $date

										]
									);
								} else {

									$remark = $addProductsToShipperResponse['message'];
									$status = 0;
									$date = date('Y-m-d H:i:s');

									$insert = DB::table('ai_bulk_product_list')->insertGetId(
										[
											'wh_account_id' => $wh_account_id,
											'file_id' => $file_id,
											'upc' => $upc,
											'remark' => $remark,
											'status' => $status,
											'upload_date' => $date

										]
									);
								}
							} else {
								$remark = 'Invalid Category ID';
								$status = 0;
								$date = date('Y-m-d H:i:s');

								$insert = DB::table('ai_bulk_product_list')->insertGetId(
									[
										'wh_account_id' => $wh_account_id,
										'file_id' => $file_id,
										'upc' => $upc,
										'remark' => $remark,
										'status' => $status,
										'upload_date' => $date

									]
								);
							}
						} else {
							// fields can not be blank

							$remark = "Some fields are blank for " . $upc;
							$status = 0;
							$date = date('Y-m-d H:i:s');

							$insert = DB::table('ai_bulk_product_list')->insertGetId(
								[
									'wh_account_id' => $wh_account_id,
									'file_id' => $file_id,
									'upc' => $upc,
									'remark' => $remark,
									'status' => $status,
									'upload_date' => $date

								]
							);
						}
					} else {

						//UPC is not available check if other details as manual product are available or not.. if available then add this product as manual product.... 
						//echo "<pre>"; print_r($product); 
						$ai_category_id = $product[1];
						$price = $product[2];
						$discount = $product[3];
						$quantity = $product[4];
						if (isset($product[5])) {
							$title = $product[5];
						} else {
							$title = "";
						}
						if (isset($product[6])) {
							$description = $product[6];
						} else {
							$description = "";
						}
						if (isset($product[7])) {
							$brand = $product[7];
						} else {
							$brand = "";
						}
						if (isset($product[8])) {
							$model = $product[8];
						} else {
							$model = "";
						}
						if (isset($product[9])) {
							$color = $product[9];
						} else {
							$color = "";
						}
						if (isset($product[10])) {
							$dimension = $product[10];
						} else {
							$dimension = "";
						}
						if (isset($product[11])) {
							$size = $product[11];
						} else {
							$size = "";
						}
						if (isset($product[12])) {
							$weight = $product[12];
						} else {
							$weight = "";
						}
						if (isset($product[13])) {
							$product_status = $product[13];
						} else {
							$product_status = "";
						}
						if (isset($product[14])) {
							$product_type = $product[14];
						} else {
							$product_type = "";
						}


						$is_manual = "Y";

						if ($ai_category_id && $price && $discount && $quantity && $title) {
							$request3 = new \Illuminate\Http\Request();

							$request3->replace(['wh_account_id' => $wh_account_id, 'upc' => $upc]);

							$request3->replace(['wh_account_id' => $wh_account_id, 'upc' => $upc, 'ai_category_id' => $ai_category_id, 'price' => $price, 'discount' => $discount, 'quantity' => $quantity, 'title' => $title, 'description' => $description, 'brand' => $brand, 'model' => $model, 'color' => $color, 'dimension' => $dimension, 'size' => $size, 'weight' => $weight, 'product_status' => $product_status, 'product_type' => $product_type, 'is_manual' => $is_manual]);


							$addManualProductsToShipper = $controllerproducts->callAction('addProductsToShipper', [$request3]);

							$addManualProductsToShipperResponse =  $addManualProductsToShipper->original;


							//echo "<pre>"; print_r($addManualProductsToShipperResponse);

							if ($addManualProductsToShipperResponse['status'] != 0) {

								$remark = $addManualProductsToShipperResponse['message'];
								$status = 1;
								$date = date('Y-m-d H:i:s');

								$insert = DB::table('ai_bulk_product_list')->insertGetId(
									[
										'wh_account_id' => $wh_account_id,
										'file_id' => $file_id,
										'upc' => $upc,
										'remark' => $remark,
										'status' => $status,
										'upload_date' => $date

									]
								);
							} else {

								$remark = $addManualProductsToShipperResponse['message'];
								$status = 0;
								$date = date('Y-m-d H:i:s');

								$insert = DB::table('ai_bulk_product_list')->insertGetId(
									[
										'wh_account_id' => $wh_account_id,
										'file_id' => $file_id,
										'upc' => $upc,
										'remark' => $remark,
										'status' => $status,
										'upload_date' => $date

									]
								);
							}
						} else {

							$remark = "Required fields are not available!";
							$status = 0;
							$date = date('Y-m-d H:i:s');

							$insert = DB::table('ai_bulk_product_list')->insertGetId(
								[
									'wh_account_id' => $wh_account_id,
									'file_id' => $file_id,
									'upc' => $upc,
									'remark' => $remark,
									'status' => $status,
									'upload_date' => $date

								]
							);

							//save this as error in DB 
						}
					}
				} else {
					// UPC can not be blank

					$remark = "UPC can not be blank";
					$status = 0;
					$date = date('Y-m-d H:i:s');

					$insert = DB::table('ai_bulk_product_list')->insertGetId(
						[
							'wh_account_id' => $wh_account_id,
							'file_id' => $file_id,
							'upc' => $upc,
							'remark' => $remark,
							'status' => $status,
							'upload_date' => $date

						]
					);
				}
			}
			$i++;
		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'File has been processed',
			'data' => [
				'addBulkProductsToShipper' => 1
			]
		]);
	}

	public function getBulkUploadedProductList(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		$ai_bulk_product_upload_file = DB::table('ai_bulk_product_upload_file AS a')

			->select('a.*')
			->where([
				['a.wh_account_id', '=', $wh_account_id]
			])

			->get();

		$i = 0;


		$finalArray = array();

		foreach ($ai_bulk_product_upload_file as $files) {

			if (isset($files->id)) {

				$finalArray[$i]['id'] =  $files->id;
				$finalArray[$i]['wh_account_id'] =  $files->wh_account_id;
				$finalArray[$i]['filename'] =  $files->filename;
				$finalArray[$i]['filepath'] =  $files->filepath;
				$finalArray[$i]['remark'] =  $files->remark;
				$finalArray[$i]['status'] = (int) $files->status;
				$finalArray[$i]['upload_date'] =  $files->upload_date;

				//color == 1 // green
				//color == 2 // blue
				//color == 3 //red

				if ($files->status == 1) {
					$finalArray[$i]['color'] = 1;  //green for all product success 
				} else if ($files->status == 0) {
					$finalArray[$i]['color'] = 3; // red for all product error
				} else {
					$finalArray[$i]['color'] = 2; // blue for partial success
				}

				$id = $files->id;

				$ai_bulk_product_list = DB::table('ai_bulk_product_list AS a')

					->select('a.*')
					->where([
						['a.file_id', '=', $id]
					])

					->get();

				$j = 0;
				$prductArray = array();
				foreach ($ai_bulk_product_list as $products) {
					$uploadproductsid = $products->id;

					if (isset($products->id)) {

						$prductArray[$j]['id'] =  $products->id;
						$prductArray[$j]['wh_account_id'] =  $products->wh_account_id;
						$prductArray[$j]['file_id'] =  $products->file_id;
						$prductArray[$j]['upc'] =  $products->upc;
						$prductArray[$j]['remark'] =  $products->remark;
						$prductArray[$j]['status'] = (int) $products->status;
						$prductArray[$j]['upload_date'] =  $products->upload_date;
					} else {

						$prductArray[$j]['id'] =  $products->id;
						$prductArray[$j]['wh_account_id'] =  $products->wh_account_id;
						$prductArray[$j]['file_id'] =  $products->file_id;
						$prductArray[$j]['upc'] =  $products->upc;
						$prductArray[$j]['remark'] =  $products->remark;
						$prductArray[$j]['status'] = (int) $products->status;
						$prductArray[$j]['upload_date'] =  $products->upload_date;
					}

					$j++;

					$finalArray[$i]['uploadedProducts'] =  $prductArray;
				}
			} else {
				$id = "";

				$finalArray[$i]['id'] =  $files->id;
				$finalArray[$i]['wh_account_id'] =  $files->wh_account_id;
				$finalArray[$i]['filename'] =  $files->filename;
				$finalArray[$i]['filepath'] =  $files->filepath;
				$finalArray[$i]['remark'] =  $files->remark;
				$finalArray[$i]['status'] = (int) $files->status;
				$finalArray[$i]['upload_date'] =  $files->upload_date;
			}

			$i++;
		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'getBulkUploadedProductList',
			'data' => [
				'getBulkUploadedProductList' => $finalArray
			]
		]);
	}

	public function addShipperOrder(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		$payment_method = $request->payment_method;


		$buyer_name = $request->buyer_name;
		$buyer_address = $request->buyer_address;
		$buyer_city = $request->buyer_city;
		$buyer_state = $request->buyer_state;
		$buyer_country = $request->buyer_country;
		$buyer_zip = $request->buyer_zip;
		$buyer_phone = $request->buyer_phone;
		$buyer_email = $request->buyer_email;


		$buyerShipAddress = array(
			"buyer_name" => $buyer_name,
			"buyer_address" => $buyer_address,
			"buyer_city" => $buyer_city,
			"buyer_state" => $buyer_state,
			"buyer_country" => $buyer_country,
			"buyer_zip" => $buyer_zip,
			"buyer_phone" => $buyer_phone,
			"buyer_email" => $buyer_email
		);

		$billing_buyer_name = $request->billing_buyer_name;
		$billing_buyer_address = $request->billing_buyer_address;
		$billing_buyer_city = $request->billing_buyer_city;
		$billing_buyer_state = $request->billing_buyer_state;
		$billing_buyer_country = $request->billing_buyer_country;
		$billing_buyer_zip = $request->billing_buyer_zip;
		$billing_buyer_phone = $request->billing_buyer_phone;
		$billing_buyer_email = $request->billing_buyer_email;


		$buyerBillingAddress = array(
			"billing_buyer_name" => $billing_buyer_name,
			"billing_buyer_address" => $billing_buyer_address,
			"billing_buyer_city" => $billing_buyer_city,
			"billing_buyer_state" => $billing_buyer_state,
			"billing_buyer_country" => $billing_buyer_country,
			"billing_buyer_zip" => $billing_buyer_zip,
			"billing_buyer_phone" => $billing_buyer_phone,
			"billing_buyer_email" => $billing_buyer_email
		);

		$order_products = $request->order_products;

		//if($wh_account_id == "" && $payment_method == "" && $buyer_name == "" && $buyer_address == "" && $buyer_city == "" && $buyer_state == "" && $buyer_country == "" && $buyer_zip == "" && $buyer_phone == "" && $buyer_email == "" && $billing_buyer_name == "" && $billing_buyer_address == "" && $billing_buyer_city == "" && $billing_buyer_state == "" && $billing_buyer_country == "" && $billing_buyer_zip == "" && $billing_buyer_phone == "" && $billing_buyer_email == "" && !is_array($order_products)  ) {

		if ($wh_account_id == "" || $payment_method == "" || $buyer_name == "" || $buyer_address == "" || $buyer_city == "" || $buyer_state == "" || $buyer_country == "" || $buyer_zip == "" || $buyer_phone == "" || $buyer_email == "" || $billing_buyer_name == "" || $billing_buyer_address == ""  || $billing_buyer_city == "" || $billing_buyer_state == ""  || $billing_buyer_country == "" || $billing_buyer_zip == "" || $billing_buyer_phone == "" || $billing_buyer_email == "" || empty($order_products)) {


			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'addOrderToShipper' => 0
				]
			]);
		}
		$totalPrice = "";

		$insertOrderId = DB::table('wh_shipper_order')->insertGetId(
			[
				'wh_account_id' => $wh_account_id,

				'invoice_no' => '',
				'invoice_prefix' => '',
				'store_id' => '',
				'store_name' => '',
				'store_url' => '',
				'customer_id' => '',
				'customer_group_id' => '',
				'firstname' => $buyer_name,
				'lastname' => '',
				'email' => $buyer_email,
				'telephone' => $buyer_phone,
				'buyer_order_id' => '',
				'shiping_address_id' => '',
				'billing_address_id' => '',
				'payment_firstname' => $billing_buyer_name,
				'payment_lastname' => '',
				'payment_company' => '',
				'payment_address_1' => $billing_buyer_address,
				'payment_address_2' => '',
				'payment_city' => $billing_buyer_city,
				'payment_postcode' => $billing_buyer_zip,
				'payment_country' => $billing_buyer_country,
				'payment_country_id' => '',
				'payment_zone' => $billing_buyer_state,
				'payment_zone_id' => '',
				'payment_address_format' => '',
				'payment_custom_field' => '',
				'payment_method' => $payment_method,
				'payment_code' => '',
				'shipping_firstname' => $buyer_name,
				'shipping_lastname' => '',
				'shipping_company' => '',
				'shipping_address_1' => $buyer_address,
				'shipping_address_2' => '',
				'shipping_city' => $buyer_city,
				'shipping_postcode' => $buyer_zip,
				'shipping_country' => $buyer_country,
				'shipping_country_id' => '',
				'shipping_zone' => $buyer_state,
				'shipping_zone_id' => '',
				'shipping_address_format' => '',
				'shipping_custom_field' => '',
				'shipping_method' => '',
				'shipping_code' => '',
				'comment' => '',
				'total' => $totalPrice,
				'affiliate_id' => '',
				'commission' => '',
				'tracking' => '',
				'ip' => ''

			]
		);




		foreach ($order_products as $order_product) {

			$oc_product_id = $order_product['oc_product_id'];
			$quantity = $order_product['quantity'];
			$seller_id = $order_product['seller_id'];
			$unitPrice = $order_product['price'];
			$totalPrice = $unitPrice * $quantity;
			$totalPriceWithCommission = $totalPrice;

			$name = '';
			$model = '';

			if ($oc_product_id == "" || $quantity == "" || $seller_id == "" || $unitPrice == "") {

				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'Order product is not complete',
					'data' => [
						'addOrderToShipper' => 0
					]
				]);
			}

			$insertOrderProduct = DB::table('wh_shipper_order_product')->insertGetId(
				[
					'wh_account_id' => $wh_account_id,
					'order_id' => $insertOrderId,
					'oc_product_id' => $oc_product_id,
					'name' => $name,
					'model' => $model,
					'quantity' => $quantity,
					'unitPrice' => $unitPrice,
					'total' => $totalPrice,
					'tax' => '',
					'reward' => '',
					'commission' => '',
					'tax' => '',
					'seller_total' => $totalPriceWithCommission,
					'seller_paid_status' => '',
					'seller_id' => $seller_id
				]
			);
		}


		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Order created',
			'data' => [
				'addOrderToShipper' => $insertOrderId
			]
		]);
	}

	public function get_product_coordinate(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$prd_id = $request->prd_id;
		$search_string = $request->search_string;


		$getToAssignProductResult_ai = DB::table('wh_producttoshipper AS o')

			->select('ac.id', 'ac.level_id', 'o.sku', 'o.upc as upc', 'ac.total_quantity', 'la.name as lanename', 'ai.name as aislename', 'fa.name as floorname')
			// ->selectRaw('o.quantity - o.assigned_qty as unassigned')
			->join('ai_product AS p', 'p.ai_product_id', '=', 'o.ai_product_id')
			->join('wh_assign_coordinates AS ac', 'ac.assignment_id', '=', 'p.ai_product_id')
			->join('wh_level AS l', 'l.id', '=', 'ac.level_id')
			->join('wh_lane AS la', 'la.id', '=', 'l.lane_id')
			->join('wh_aisle AS ai', 'ai.id', '=', 'l.aisle_id')
			->join('wh_floor AS fa', 'fa.id', '=', 'l.floor_id')


			->where(function ($query)  use ($wh_account_id, $prd_id) {
				$query->where('o.wh_account_id', '=', $wh_account_id)
					->where('ac.assignment_type', '=', 'ai')
					->where('ac.total_quantity', '>', 0)
					->where('ac.wh_account_id', '=', $wh_account_id)
					->where('ac.assignment_id', '=', $prd_id);
			})
			->get();
		// ->toSql(); 
		// if($getToAssignProductResult_ai){
		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Product Assigned list',
			'data' => [
				'AssignedProducts' => $getToAssignProductResult_ai
			]
		]);
		// }else{
		// return response()->json([
		// 'status' => 0,
		// 'code' =>402,
		// 'message' =>'No Data Found',
		// 'data' => [
		// 'AssignedProducts' => 'No Data Found';
		// ]
		// ]);
		// }

	}

	public function getShipperProducts(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'getShipperProducts' => 0
				]
			]);
		}

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}

		if (isset($request->product_id)) {
			$product_id = $request->product_id;
		} else {
			$product_id = "";
		}

		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}

		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select(
			'p.*',
			'wp.id as product_id',
			'wp.ai_product_id as prd_id',
			'wp.wh_account_id',
			'wp.price',
			'wp.quantity as DB_qty',
			'wp.image as images',
			'wp.ordered_qty',
			'wp.sku',
			'wp.discount',
			'wp.ai_category_id',
			'wp.subcategory_id',
			'wp.status',
			'wp.product_type as product_type',
			'wp.product_condition',
			'c.name as ai_category_name',
			'c.id as ai_category_id',
			'c.image as ai_category_image',
			'wp.product_variation',
			'wp.variation_type',
			'wp.parent_product_id',
			'wp.variation_category_name',
			'wp.variation_name_value',
			'wp.event_location',
			'wp.event_date_time',
			DB::raw("(wp.quantity - wp.ordered_qty) as quantity"),
			DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")
			// DB::raw('group_concat(ass.level_id) as level_id')			
		);

		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});
		// $query->join("wh_assign_coordinates as ass",function($join){
		// $join->on("ass.assignment_id","=","p.ai_product_id") ;
		// }); 
		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		$query->leftjoin("wh_provider_zipcode as pz", function ($join) {
			$join->on("pz.wh_account_id", "=", "wp.wh_account_id");
		});

		if ($wh_account_id != 'All') {
			$query->where([
				['wp.wh_account_id', '=', $wh_account_id]
			]);
		} else {
		}

		//$query->where([	['wp.product_type', '=', 'AI'] ]);
		$query->where([['wp.product_type', '!=', 'ECOM']]);

		if ($upc) {
			$query->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($ai_category_id) {
			$query->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query->where([
				['p.ai_product_id', '=', $ai_product_id]
			]);
		}

		if ($product_id) {
			$query->where([
				['wp.id', '=', $product_id]
			]);
		}

		if ($zipcode) {
			$query->where([
				['pz.zipcode', '=', $zipcode]
			]);
		}

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}


		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}
		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		$query->Where(function ($query) use ($search_string) {
			$query->where('p.ai_product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.title', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%')
			;
		});


		$query->groupBy(DB::raw('p.ai_product_id'));

		$query->orderBy("wp.id", "DESC");


		//$query->offset(0);
		//$query->limit(200);

		$query->offset($limit1);
		$query->limit($limit2);


		if ($upc) {

			$getSellerProducts_ai = $query->get()->first();
			//$getSellerProducts = $query->get();
		} else {
			$getSellerProducts_ai = $query->get();
		}




		//dd(DB::getQueryLog()); // Show results of log

		/*
			$query11= DB::table('ai_category AS c');
			 
			$query11->select( 'c.id', 'c.name', 'c.image' , 'c.status');
			$query11->orderBy("c.code","ASC");
			$getCategories = $query11->get();
			
			$finalArray = array();
			$i=0;
			
			foreach($getSellerProducts as $product){
			 
				$finalArray[$i]['ai_product_id'] = $product->ai_product_id;
				$finalArray[$i]['upc'] = $product->upc;
				$finalArray[$i]['title'] = $product->title;
				$finalArray[$i]['description'] = $product->description;
				$finalArray[$i]['weight'] = $product->weight;
				$finalArray[$i]['lowest_recorded_price'] = $product->lowest_recorded_price;
				$finalArray[$i]['highest_recorded_price'] = $product->highest_recorded_price;
				$finalArray[$i]['images'] = $product->images;
				$finalArray[$i]['status'] = $product->status;
				$finalArray[$i]['product_id'] = $product->product_id;
				$finalArray[$i]['wh_account_id'] = $product->wh_account_id;
				$finalArray[$i]['price'] = $product->price;
				$finalArray[$i]['quantity'] = $product->quantity;
				$finalArray[$i]['sku'] = $product->sku;
				$finalArray[$i]['discount'] = $product->discount;
				$finalArray[$i]['ai_category_id'] = $product->ai_category_id;
				$finalArray[$i]['ai_category_name'] = $product->ai_category_name;
				$finalArray[$i]['discounted_price'] = $product->discounted_price;
				$finalArray[$i]['getCategories'] = $getCategories;
				
				$i++;
			}
			
			
			
			
			
			//echo "<pre>"; print_r($finalArray);
			
			//$getSellerProducts['Categories'] = "asdasd";
		//	$getSellerProducts->append($getCategories);
			
			 */
		########## ecomm  prd add ###

		$query2 = DB::table('oc_product AS p');

		// $query2->select( 'p.*','ac.*',	DB::raw("round((p.price) - ( (p.discount/100) * (p.price) ),2 ) as discounted_price") );
		$query2->select(
			'p.product_id as ai_product_id',
			'p.upc',
			'p.name as title',
			'p.ean',
			'p.description',
			'wp.image as images',
			'wp.id as product_id',
			'wp.ai_product_id as prd_id',
			'wp.wh_account_id',
			'wp.price',
			'wp.quantity as DB_qty',
			'wp.ordered_qty',
			'wp.sku',
			'wp.discount',
			'wp.ai_category_id',
			'wp.subcategory_id',
			'wp.status',
			'wp.product_type as product_type',
			'wp.product_condition',
			'c.name as ai_category_name',
			'c.id as ai_category_id',
			'c.image as ai_category_image',
			'wp.product_variation',
			'wp.variation_type',
			'wp.parent_product_id',
			'wp.variation_category_name',
			DB::raw("(wp.quantity - wp.ordered_qty) as quantity"),
			DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")
		);

		$query2->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.product_id");
		});

		$query2->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		// $query2->join("wh_provider_zipcode as pz",function($join){
		// $join->on("pz.wh_account_id","=","ac.wh_account_id") ;
		// 

		$query2->where([
			['wp.product_type', '=', 'ECOM']
		]);

		if ($product_id) {
			$query2->where([
				['wp.id', '=', $product_id]
			]);
		}

		if ($upc) {
			$query2->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($wh_account_id) {
			$query2->where([
				['wp.wh_account_id', '=', $wh_account_id]
			]);
		}

		if ($ai_category_id) {
			$query2->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query2->where([
				['p.product_id', '=', $ai_product_id]
			]);
		}
		$query2->where([
			['wp.quantity', '>', 0]
		]);

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}

		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}
		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		$query2->Where(function ($query2) use ($search_string) {
			$query2->where('p.product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.name', 'LIKE', '%' . $search_string . '%')
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%');
		});


		$query2->groupBy(DB::raw('p.product_id'));

		$query2->orderBy("wp.id", "DESC");


		//$query->offset(0);
		//$query->limit(200);

		$query2->offset($limit1);
		$query2->limit($limit2);


		if ($upc) {

			$getMasterProducts_eccom = $query2->get()->first();
			//$getSellerProducts = $query->get();
		} else {
			$getMasterProducts_eccom = $query2->get();
		}
		// $getMasterProducts_eccom = $query2->get();

		// die;

		if ($getMasterProducts_eccom) {
			//$getSellerProducts = $getSellerProducts_ai->concat($getMasterProducts_eccom);  //enable ecom uncomment this
			$getSellerProducts = $getSellerProducts_ai;
		} else {
			$getSellerProducts = $getSellerProducts_ai;
		}

		########## ecomm  prd add ###

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getSellerProducts' => $getSellerProducts
			]
		]);
	}

	public function getShipperProductsTotalCount(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'getShipperProducts' => 0
				]
			]);
		}

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}

		if (isset($request->product_id)) {
			$product_id = $request->product_id;
		} else {
			$product_id = "";
		}

		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}

		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select("p.ai_product_id");

		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});
		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		$query->leftjoin("wh_provider_zipcode as pz", function ($join) {
			$join->on("pz.wh_account_id", "=", "wp.wh_account_id");
		});

		if ($wh_account_id != 'All') {
			$query->where([['wp.wh_account_id', '=', $wh_account_id]]);
		}
		//$query->where([	['wp.product_type', '=', 'AI'] ]);
		$query->where([['wp.product_type', '!=', 'ECOM']]);

		if ($upc) {
			$query->where([['p.upc', '=', $upc]]);
		}

		if ($ai_category_id) {
			$query->where([['wp.ai_category_id', '=', $ai_category_id]]);
		}

		if ($ai_product_id) {
			$query->where([['p.ai_product_id', '=', $ai_product_id]]);
		}

		if ($product_id) {
			$query->where([['wp.id', '=', $product_id]]);
		}

		if ($zipcode) {
			$query->where([['pz.zipcode', '=', $zipcode]]);
		}

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}


		$query->Where(function ($query) use ($search_string) {
			$query->where('p.ai_product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.title', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%')
			;
		});


		$query->groupBy(DB::raw('p.ai_product_id'));

		$query->orderBy("wp.id", "DESC");


		if ($upc) {

			$getSellerProducts_ai = $query->get()->first();
			//$getSellerProducts = $query->get();
		} else {
			$getSellerProducts_ai = $query->get();
		}

		########## ecomm  prd add ###

		$query2 = DB::table('oc_product AS p');

		// $query2->select( 'p.*','ac.*',	DB::raw("round((p.price) - ( (p.discount/100) * (p.price) ),2 ) as discounted_price") );
		$query2->select('p.product_id as ai_product_id');

		$query2->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.product_id");
		});

		$query2->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		// $query2->join("wh_provider_zipcode as pz",function($join){
		// $join->on("pz.wh_account_id","=","ac.wh_account_id") ;
		// 

		$query2->where([
			['wp.product_type', '=', 'ECOM']
		]);

		if ($product_id) {
			$query2->where([
				['wp.id', '=', $product_id]
			]);
		}

		if ($upc) {
			$query2->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($wh_account_id) {
			$query2->where([
				['wp.wh_account_id', '=', $wh_account_id]
			]);
		}

		if ($ai_category_id) {
			$query2->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query2->where([
				['p.product_id', '=', $ai_product_id]
			]);
		}
		$query2->where([
			['wp.quantity', '>', 0]
		]);

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}

		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}
		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		$query2->Where(function ($query2) use ($search_string) {
			$query2->where('p.product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.name', 'LIKE', '%' . $search_string . '%')
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%');
		});


		$query2->groupBy(DB::raw('p.product_id'));

		$query2->orderBy("wp.id", "DESC");


		//$query->offset(0);
		//$query->limit(200);

		$query2->offset($limit1);
		$query2->limit($limit2);


		if ($upc) {

			$getMasterProducts_eccom = $query2->get()->first();
			//$getSellerProducts = $query->get();
		} else {
			$getMasterProducts_eccom = $query2->get();
		}
		// $getMasterProducts_eccom = $query2->get();

		// die;

		if ($getMasterProducts_eccom) {
			//$getSellerProducts = $getSellerProducts_ai->concat($getMasterProducts_eccom);  //enable ecom uncomment this
			$getSellerProducts = $getSellerProducts_ai;
		} else {
			$getSellerProducts = $getSellerProducts_ai;
		}

		########## ecomm  prd add ###

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getSellerProducts' => $getSellerProducts
			]
		]);
	}


	public function getMasterProducts2(Request $request)
	{

		//$wh_account_id = $request->wh_account_id;

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}

		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}

		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select('p.*', DB::raw('group_concat(wp.id) as product_id'), DB::raw('group_concat(wp.wh_account_id) as shipper_id'), DB::raw('group_concat(c.name) as categories'),  DB::raw('group_concat(c.id) as category_ids'), DB::raw('group_concat(wp.price) as prices'),  DB::raw('min(wp.price) as lowest_price'), 'pz.estimate_time');

		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});

		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});

		$query->join("wh_provider_zipcode as pz", function ($join) {
			$join->on("pz.wh_account_id", "=", "wp.wh_account_id");
		});



		if ($upc) {
			$query->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($ai_category_id) {
			$query->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query->where([
				['p.ai_product_id', '=', $ai_product_id]
			]);
		}

		if ($zipcode) {
			$query->where([
				['pz.zipcode', '=', $zipcode]
			]);
		}

		$query->groupBy(DB::raw('p.ai_product_id'));

		//$query->offset(0);
		//$query->limit(20);

		if ($ai_product_id || $upc) {

			//$getSellerProducts = $query->get()->first();
			$getMasterProducts = $query->get();
		} else {
			$getMasterProducts = $query->get();
		}

		//dd(DB::getQueryLog()); // Show results of log

		$getOrder = array();
		$getOrderProduct = array();
		$i = 0;
		foreach ($getMasterProducts as $getMasterProduct) {

			$ai_product_id = $getMasterProduct->ai_product_id;
			$getOrder[$i]['ai_product_id'] = $getMasterProduct->ai_product_id;
			//$getOrder[$i]['customer_id'] = $getMasterProduct->customer_id; 

		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getMasterProducts' => $getMasterProducts
			]
		]);
	}



	private function getConditionDetails($ai_product_id, $wh_account_id, $zipcode, $ai_category_id, $condition)
	{
		$query = DB::table('wh_producttoshipper AS wp');
		$query->select('wp.wh_account_id', 'wp.price', 'wp.quantity', 'wp.product_condition');
		$query->where([
			['wp.ai_product_id', '=', $ai_product_id],
			['wp.product_type', '=', $condition],
		]);

		if ($ai_category_id) {
			$query->where('wp.ai_category_id', $ai_category_id);
		}

		if ($wh_account_id) {
			$query->where('wp.wh_account_id', $wh_account_id);
		}

		// if ($zipcode) {
		// $query->join('wh_provider_zipcode as pz', 'pz.wh_account_id', '=', 'wp.wh_account_id');
		// $query->where('pz.zipcode', '=', $zipcode);
		// }

		return $query->get();
	}

	public function getMasterProducts(Request $request)
	{

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}
		if (isset($request->wh_account_id)) {
			$wh_account_id = $request->wh_account_id;
		} else {
			$wh_account_id = "";
		}
		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}
		if (isset($request->product_id)) {
			$product_id = $request->product_id;
		} else {
			$product_id = "";
		}

		if (isset($request->limit_id)) {
			$limit_id = $request->limit_id;
		} else {
			$limit_id = 0;
		}

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}
		if (isset($request->user_id)) {
			$user_id = $request->user_id;
		} else {
			$user_id = "";
		}

		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}
		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		//Get AI Master products
		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select('p.*', 'wp.product_type', 'wp.product_condition', 'wp.image as seller_product_image');
		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});
		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		//$query->leftjoin("wh_provider_zipcode as pz",function($join){ $join->on("pz.wh_account_id","=","wp.wh_account_id") ; }); 

		$query->where([['p.status', '=', 1]]);

		if ($upc) {
			$query->where([['p.upc', '=', $upc]]);
		}
		if ($wh_account_id) {
			$query->where([['wp.wh_account_id', '=', $wh_account_id]]);
		}
		if ($ai_category_id) {
			$query->where([['wp.ai_category_id', '=', $ai_category_id]]);
		}
		if ($ai_product_id) {
			$query->where([['p.ai_product_id', '=', $ai_product_id]]);
		}
		if ($product_id) {
			$query->where([['wp.id', '=', $product_id]]);
		}
		//if($zipcode) { $query->where([ ['pz.zipcode', '=', $zipcode] ]); }

		if ($limit_id > 0) {
			$query->where('wp.id', '<', $limit_id);
		}
		$query->where([['wp.product_type', '!=', 'ECOM']]);
		$query->where([['wp.status', '!=', 'N']]);
		$query->Where(function ($query) use ($search_string) {
			$query->where('p.ai_product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.title', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.brand', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.model', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.color', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.size', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.dimension', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.weight', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.category', 'LIKE', '%'.$search_string.'%')	
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%') 
			;
		});


		$query->groupBy(DB::raw('p.ai_product_id'));
		$query->orderBy("p.ai_product_id", "DESC");
		$query->offset($limit1);
		$query->limit($limit2);

		$getMasterProducts = $query->get();

		########## Get ecomm Master prduct ###

		$query2 = DB::table('oc_product AS p');
		$query2->select('p.*', 'ac.*', 'ac.image as seller_product_image', DB::raw("round((p.price) - ( (p.discount/100) * (p.price) ),2 ) as discounted_price"));
		$query2->join("wh_producttoshipper as ac", function ($join) {
			$join->on("ac.ai_product_id", "=", "p.product_id");
		});
		// $query2->join("wh_provider_zipcode as pz",function($join){
		// $join->on("pz.wh_account_id","=","ac.wh_account_id") ;
		// });  
		$query2->where([
			['ac.product_type', '=', 'ECOM']
		]);
		$query2->where([
			['ac.status', '!=', 'N']
		]);

		if ($product_id) {
			$query2->where([
				['ac.id', '=', $product_id]
			]);
		}

		if ($upc) {
			$query2->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($wh_account_id) {
			$query2->where([
				['ac.wh_account_id', '=', $wh_account_id]
			]);
		}

		if ($ai_category_id) {
			$query2->where([
				['ac.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query2->where([
				['p.product_id', '=', $ai_product_id]
			]);
		}
		$query2->where([
			['ac.quantity', '>', 0]
		]);

		$query2->offset($limit1);
		$query2->limit($limit2);

		$getMasterProducts_eccom = $query2->get();

		if ($getMasterProducts_eccom) {
			//$combinedResults = $getMasterProducts->concat($getMasterProducts_eccom);
			$combinedResults = $getMasterProducts;
		} else {
			$combinedResults = $getMasterProducts;
		}

		//dd(DB::getQueryLog()); // Show results of log
		$conditionDetails = [];
		$getProduct = array();
		$getAllProduct = array();
		$i = 0;
		$cart = new Cart();

		foreach ($combinedResults as $getMasterProduct) {

			if (@$getMasterProduct->product_type == 'ECOM') {

				// Check for the ECOM condition

				$ai_product_id_fetched = $getMasterProduct->ai_product_id;
				$id = $getMasterProduct->id;

				$query3 = DB::table('wh_producttoshipper AS wp');
				$query3->select(
					'wp.id as product_id',
					'wp.wh_account_id as shipper_id',
					'c.name as categories',
					'c.id as category_ids',
					'wp.quantity',
					'wp.ordered_qty',
					'wp.sku',
					'wp.image as seller_product_image',
					'wp.ai_category_id',
					'c.name as ai_category_name',
					'wp.price as price',
					'c.image as ai_category_image',
					'wp.discount as discount',
					'wp.product_condition',
					'wp.product_type',
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")
				);

				$query3->join("ai_category as c", function ($join) {
					$join->on("wp.ai_category_id", "=", "c.id");
				});
				// $query3->join("wh_provider_zipcode as pz",function($join){$join->on("pz.wh_account_id","=","wp.wh_account_id") ;}); 

				$query3->where([
					['wp.product_type', '=', 'ECOM']
				]);
				$query3->where([
					['wp.id', '=', $id]
				]);

				if ($ai_category_id) {
					$query3->where([
						['wp.ai_category_id', '=', $ai_category_id]
					]);
				}
				if ($wh_account_id) {
					$query3->where([
						['wp.wh_account_id', '=', $wh_account_id]
					]);
				}

				if ($product_id) {
					$query3->where([
						['wp.id', '=', $product_id]
					]);
				}

				$query3->where([
					['wp.ai_product_id', '=', $ai_product_id_fetched]
				]);

				// if($zipcode) {  
				// $query3->where([['pz.zipcode', '=', $zipcode] ]);
				// }

				$query3->orderBy('wp.price', 'asc');

				$getShipperProducts = $query3->get()->first();

				if (isset($getShipperProducts->product_id)) {

					$getProduct[$i]['is_deliverable'] = 1;
					$getProduct[$i]['parent_product_id'] = "";
					$getProduct[$i]['product_variation'] = "N";
					$getProduct[$i]['variation_type'] = "";
					$getProduct[$i]['variation_category_name'] = "";
					$getProduct[$i]['getChildProducts'] = array();

					$titleOutput = preg_replace_callback('/([.!?])\s*(\w)/', function ($matches) {
						return strtoupper($matches[1] . ' ' . $matches[2]);
					}, ucfirst(strtolower($getMasterProduct->name)));

					$getProduct[$i]['ai_product_id'] = $getMasterProduct->ai_product_id;
					$getProduct[$i]['upc'] = $getMasterProduct->upc;
					$getProduct[$i]['title'] = $titleOutput;
					$getProduct[$i]['description'] = $getMasterProduct->description;
					$getProduct[$i]['type'] = $getMasterProduct->product_type;

					$weight = "";
					$currency = "";
					$getProduct[$i]['weight'] = $weight;

					$getProduct[$i]['currency'] = $currency;
					$getProduct[$i]['images'] = $getMasterProduct->seller_product_image;

					$this->db = DB::table('wh_warehouse_user as u');
					$this->db->select(["u.id", "ua.company as store_name", "company_icon as store_icon"]);
					$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
					$this->db->where(['u.wh_account_id' => $getShipperProducts->shipper_id]);
					$storename1 = $this->db->get()->first();
					if (isset($storename1->store_name)) {
						$storename = $storename1->store_name;
					} else {
						$storename = 'NA';
					}
					$getProduct[$i]['store_name'] = $storename;
					$getProduct[$i]['store_icon'] = '';

					$getProductPrice = $cart->getProductPrice($getShipperProducts->price, $getShipperProducts->discount);

					$product_price = $getProductPrice['product_price'];
					$discounted_price = $getProductPrice['discounted_price'];

					// $getProduct[$i]['shipper_id'] = $getMasterProduct->wh_account_id;  
					// $getProduct[$i]['product_id'] = $getMasterProduct->product_id; 
					// $getProduct[$i]['category_id'] = ''; 
					// $getProduct[$i]['category_name'] = ''; 
					// $getProduct[$i]['category_image'] = ''; 
					// $getProduct[$i]['rating'] = ''; 
					// $getProduct[$i]['free_shipping'] = ''; 
					// $getProduct[$i]['quantity'] =$getMasterProduct->quantity;
					// $getProduct[$i]['ordered_qty'] =0;
					// $getProduct[$i]['product_price1'] =$getMasterProduct->price;
					// $getProduct[$i]['product_price'] =$product_price;
					// $getProduct[$i]['discount'] =$getMasterProduct->discount;
					// $getProduct[$i]['discounted_price'] = $discounted_price;

					$getProduct[$i]['shipper_id'] = $getShipperProducts->shipper_id;
					$getProduct[$i]['product_id'] = $getShipperProducts->product_id;
					$getProduct[$i]['category_id'] = $getShipperProducts->ai_category_id;
					$getProduct[$i]['category_name'] = $getShipperProducts->ai_category_name;
					$getProduct[$i]['category_image'] = $getShipperProducts->ai_category_image;
					$getProduct[$i]['rating'] = '';
					$getProduct[$i]['free_shipping'] = '';
					$getProduct[$i]['quantity'] = $getShipperProducts->quantity;
					$getProduct[$i]['ordered_qty'] = $getShipperProducts->ordered_qty;
					$getProduct[$i]['product_price1'] = $getShipperProducts->price;
					$getProduct[$i]['product_price'] = $product_price;
					$getProduct[$i]['discount'] = $getShipperProducts->discount;
					$getProduct[$i]['discounted_price'] = $discounted_price;
					$getProduct[$i]['product_type'] = $getShipperProducts->product_condition;

					if ($user_id) {

						$this->db = DB::table('ai_wishlist_details as cd');
						$this->db->select(["cd.wishlist_id"]);
						$this->db->join('ai_wishlist as c', 'c.wishlist_id', '=', 'cd.wishlist_id');
						$this->db->where(['cd.shipper_id' => $getShipperProducts->shipper_id, 'cd.product_id' => $getShipperProducts->product_id, 'c.user_id' => $user_id]);
						$result = $this->db->get()->first();

						if ($result) {
							$wishlist_id = $result->wishlist_id;
							if ($wishlist_id) {
								$getProduct[$i]['is_in_my_wish_list'] = 1;
							} else {
								$getProduct[$i]['is_in_my_wish_list'] = 0;
							}
						} else {
							$getProduct[$i]['is_in_my_wish_list'] = 0;
						}

						$this->db = DB::table('ai_cart_details as cd');
						$this->db->select(["cd.cart_id", "cd.id as cart_detail_id", "cd.product_id", "cd.quantity"]);
						$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
						$this->db->where(['c.shipper_id' => $getShipperProducts->shipper_id, 'cd.product_id' => $getShipperProducts->product_id, 'c.user_id' => $user_id]);
						$result1 = $this->db->get();

						if (count($result1) === 0) {

							$getProduct[$i]['is_in_my_cart_list'] = 0;
							$getProduct[$i]['cart_array'] = array();
						} else {

							$cart_id = $result1[0]->cart_id;
							if ($cart_id) {
								$getProduct[$i]['is_in_my_cart_list'] = 1;
								$getProduct[$i]['cart_array'] = $result1;
							} else {
								$getProduct[$i]['is_in_my_cart_list'] = 0;
								$getProduct[$i]['cart_array'] = array();
							}
						}
					} else {
						$getProduct[$i]['is_in_my_wish_list'] = 0;
						$getProduct[$i]['is_in_my_cart_list'] = 0;
						$getProduct[$i]['cart_array'] = array();
					}

					if ($getMasterProduct->ai_product_id) {
						$ecomConditionDetails = $this->getConditionDetails($getMasterProduct->ai_product_id, $wh_account_id, $zipcode, $ai_category_id, 'ECOM');
						// $conditionDetails[$getMasterProduct->ai_product_id] = $ecomConditionDetails;
						$getProduct[$i]['ECOM_product_has_store'] = $ecomConditionDetails;
					}
				}
				// else {
				// $getProduct[$i]['shipper_id'] = null;  
				// $getProduct[$i]['product_id'] = null; 
				// $getProduct[$i]['product_price'] = null; 
				// $getProduct[$i]['discount'] = null; 
				// $getProduct[$i]['discounted_price'] = null; 
				// $getProduct[$i]['category_id'] = null; 
				// $getProduct[$i]['category_name'] = null; 
				// $getProduct[$i]['category_image'] = null; 
				// $getProduct[$i]['rating'] = null; 
				// $getProduct[$i]['free_shipping'] = null; 
				// $getProduct[$i]['is_in_my_wish_list'] = 0; 
				// $getProduct[$i]['is_in_my_cart_list'] = 0;
				// $getProduct[$i]['cart_array'] = array(); 


				// }

				############## ecomm end###################


			} else {
				// Check for the AI product condition
				$ai_product_id_fetched = $getMasterProduct->ai_product_id;

				//DB::enableQueryLog(); 

				$query4 = DB::table('wh_producttoshipper AS wp');
				$query4->select(
					'wp.id as product_id',
					'wp.wh_account_id as shipper_id',
					'c.name as categories',
					'c.id as category_ids',
					'wp.quantity',
					'wp.ordered_qty',
					'wp.sku',
					'wp.product_variation',
					'wp.variation_type',
					'wp.parent_product_id',
					'wp.variation_category_name',
					'wp.ai_category_id',
					'c.name as ai_category_name',
					'wp.price as price',
					'c.image as ai_category_image',
					'wp.discount as discount',
					'wp.product_condition',
					'wp.product_type',
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"),

					//DB::raw('ROUND( 111.111 * DEGREES(ACOS(LEAST(1.0, COS(RADIANS(z.lat)) * COS(RADIANS(z2.lat)) * COS(RADIANS(z.lng - z2.lng)) + SIN(RADIANS(z.lat)) * SIN(RADIANS(z2.lat))))),2) AS distance_in_km') 
				);

				$query4->join("ai_category as c", function ($join) {
					$join->on("wp.ai_category_id", "=", "c.id");
				});

				//$query4->join("wh_provider_zipcode as pz",function($join){$join->on("pz.wh_account_id","=","wp.wh_account_id") ;});
				//$query2->join("wh_zipcode as z",function($join){$join->on("z.zip","=","pz.zipcode") ;}); 
				//$query2->join("wh_warehouse_user as u",function($join){ $join->on("u.wh_account_id","=","wp.wh_account_id") ; }); 
				//$query2->join("wh_warehouse_user_address as ua",function($join){$join->on("ua.warehouse_user_id","=","u.id") ;}); 
				//$query2->join("wh_zipcode as z2",function($join){ $join->on("z2.zip","=","ua.postcode") ; }); 

				$query4->where([['wp.product_type', '!=', 'ECOM']]);
				if ($ai_category_id) {
					$query4->where([
						['wp.ai_category_id', '=', $ai_category_id]
					]);
				}
				if ($wh_account_id) {
					$query4->where([
						['wp.wh_account_id', '=', $wh_account_id]
					]);
				}

				if ($product_id) {
					$query4->where([
						['wp.id', '=', $product_id]
					]);
				}

				$query4->where([
					['wp.ai_product_id', '=', $ai_product_id_fetched]
				]);

				//if($zipcode) {  $query4->where([['pz.zipcode', '=', $zipcode] ]);  }
				//$query2->groupBy(DB::raw('wp.ai_product_id'));
				//$query->orderBy('distance_in_km', 'asc');
				$query4->orderBy('wp.price', 'asc');
				//$query->offset(0);
				//$query->limit(20); 
				$getShipperProducts = $query4->get()->first();
				//$getShipperProducts_price = min(array_column($getShipperProducts, 'prices'));

				if (isset($getShipperProducts->product_id)) {

					if ($zipcode) {
						//check deliverable or not
						$this->db = DB::table('wh_provider_zipcode as pz');
						$this->db->select(["pz.id"]);
						$this->db->where(['pz.wh_account_id' => $getShipperProducts->shipper_id, 'pz.zipcode' => $zipcode]);
						$zip_result = $this->db->get()->first();

						if ($zip_result) {
							$zip_id = $zip_result->id;
							if ($zip_id) {
								$getProduct[$i]['is_deliverable'] = 1;
							} else {
								$getProduct[$i]['is_deliverable'] = 0;
							}
						} else {
							$getProduct[$i]['is_deliverable'] = 0;
						}
					} else {
						$getProduct[$i]['is_deliverable'] = -1;
					}

					$getProduct[$i]['getChildProducts'] = array();

					$product_variation = $getShipperProducts->product_variation;
					$variation_type = $getShipperProducts->variation_type;
					$parent_product_id = $getShipperProducts->parent_product_id;
					$variation_category_name = $getShipperProducts->variation_category_name;

					if ($variation_type == 'Child' && $parent_product_id != '') {
						$getProduct[$i]['is_deliverable'] = 1;

						$query_1 = DB::table('wh_producttoshipper AS wp');
						$query_1->select('wp.*', 'wp.id as product_id', 'wp.wh_account_id as shipper_id', 'wp.image as seller_product_image', 'wpp.parent_title', 'wpp.parent_description', 'wpp.parent_image', DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"));
						$query_1->join('wh_producttoshipper_parent as wpp', 'wpp.parent_product_id', '=', 'wp.parent_product_id');
						$query_1->where([['wp.parent_product_id', '=', $parent_product_id]]);

						$getChildProducts = $query_1->get();

						//$getProduct[$i]['getChildProducts'] = $getChildProducts;

						//cart details
						$f = 0;
						$getProduct[$i]['getChildProducts'] = array();
						foreach ($getChildProducts as $child_product) {
							$getProduct[$i]['getChildProducts'][$f] = $child_product;
							$event_date_time_explode = explode(" ", $child_product->event_date_time);
							$date = date_create($event_date_time_explode[0]);
							$timeonly = date('h:i A', strtotime($child_product->event_date_time));
							$getProduct[$i]['getChildProducts'][$f]->event_date = date('D', strtotime($child_product->event_date_time)) . '-' . date_format($date, "M d");
							$getProduct[$i]['getChildProducts'][$f]->event_time = $timeonly;
							$getProduct[$i]['getChildProducts'][$f]->is_deliverable = 1;

							if ($user_id) {
								$this->db = DB::table('ai_cart_details as cd');
								$this->db->select(["cd.cart_id", "cd.id as cart_detail_id", "cd.product_id", "cd.quantity"]);
								$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
								$this->db->where(['c.shipper_id' => $child_product->shipper_id, 'cd.product_id' => $child_product->product_id, 'c.user_id' => $user_id]);
								$result1 = $this->db->get();
								//print_r($result1);
								if (count($result1) === 0) {

									$getProduct[$i]['getChildProducts'][$f]->is_in_my_cart_list = 0;
									$getProduct[$i]['getChildProducts'][$f]->cart_array = array();
								} else {

									$cart_id = $result1[0]->cart_id;
									if ($cart_id) {
										$getProduct[$i]['getChildProducts'][$f]->is_in_my_cart_list = 1;
										$getProduct[$i]['getChildProducts'][$f]->cart_array = $result1;
									} else {
										$getProduct[$i]['getChildProducts'][$f]->is_in_my_cart_list = 0;
										$getProduct[$i]['getChildProducts'][$f]->cart_array = array();
									}
								}
							}
							$f++;
						}
					}

					$titleOutput = preg_replace_callback('/([.!?])\s*(\w)/', function ($matches) {
						return strtoupper($matches[1] . ' ' . $matches[2]);
					}, $getMasterProduct->title);

					$getProduct[$i]['ai_product_id'] = $getMasterProduct->ai_product_id;
					$getProduct[$i]['upc'] = $getMasterProduct->upc;
					$getProduct[$i]['title'] = $titleOutput;
					//$getProduct[$i]['ean'] = $getMasterProduct->ean; 
					$getProduct[$i]['description'] = $getMasterProduct->description;
					$getProduct[$i]['type'] = $getMasterProduct->product_type;
					$getProduct[$i]['product_variation'] = $product_variation;
					$getProduct[$i]['variation_type'] = $variation_type;
					$getProduct[$i]['parent_product_id'] = $parent_product_id;
					$getProduct[$i]['variation_category_name'] = $variation_category_name;
					//$getProduct[$i]['brand'] = $getMasterProduct->brand; 
					//$getProduct[$i]['color'] = $getMasterProduct->color; 
					//$getProduct[$i]['dimension'] = $getMasterProduct->dimension; 
					//$getProduct[$i]['size'] = $getMasterProduct->size; 
					//$getProduct[$i]['title'] = $getMasterProduct->title; 

					$weight = "";
					/* $weight = $getMasterProduct->weight;
					
					if($weight != "") {
						if (strpos($weight, 'Pounds') !== false) {
							$weight = round((float) $weight,2);
							
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
							 
						
						} if (strpos($weight, 'pounds') !== false) {
							$weight = round((float) $weight,2);
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
							
							
						
						} else if (strpos($weight, 'lbs') !== false) {
							$weight = round((float) $weight,2);
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
							 
						
						} else if (strpos($weight, 'lb') !== false) {
							$weight = round((float) $weight,2);
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
							 
						
						} else if (strpos($weight, 'kg') !== false) {
							$weight = round((float) $weight * 2.20462,2);
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
						
						} else if (strpos($weight, 'ounces') !== false) {
							$weight = round((float) $weight / 16 , 2);
							
							if($weight ==0 || $weight ==0.0 || $weight ==0.00 ) {
								$weight = "";
							} else {
								$weight = $weight.' lb';
							}
						
						} else if (strpos($weight, 'das') !== false) {
							$weight = "";
						} else {
							//$weight = "";
						} 
					}
					 */
					$getProduct[$i]['weight'] = $weight;

					$getProduct[$i]['currency'] = $getMasterProduct->currency;
					//$getProduct[$i]['lowest_recorded_price'] = $getMasterProduct->lowest_recorded_price; 
					//$getProduct[$i]['highest_recorded_price'] = $getMasterProduct->highest_recorded_price; 
					$getProduct[$i]['images'] = $getMasterProduct->seller_product_image;

					// if(isset($getShipperProducts->product_id)) {
					$this->db = DB::table('wh_warehouse_user as u');
					$this->db->select(["u.id", "ua.company as store_name", "company_icon as store_icon"]);
					$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
					$this->db->where(['u.wh_account_id' => $getShipperProducts->shipper_id]);
					$storename1 = $this->db->get()->first();
					if (isset($storename1->store_name)) {
						$storename = $storename1->store_name;
					} else {
						$storename = 'NA';
					}
					$getProduct[$i]['store_name'] = $storename;
					$getProduct[$i]['store_icon'] = '';

					$getProductPrice = $cart->getProductPrice($getShipperProducts->price, $getShipperProducts->discount);

					$product_price = $getProductPrice['product_price'];
					$discounted_price = $getProductPrice['discounted_price'];

					$getProduct[$i]['shipper_id'] = $getShipperProducts->shipper_id;
					$getProduct[$i]['product_id'] = $getShipperProducts->product_id;
					$getProduct[$i]['category_id'] = $getShipperProducts->ai_category_id;
					$getProduct[$i]['category_name'] = $getShipperProducts->ai_category_name;
					$getProduct[$i]['category_image'] = $getShipperProducts->ai_category_image;
					$getProduct[$i]['rating'] = '';
					$getProduct[$i]['free_shipping'] = '';
					$getProduct[$i]['quantity'] = $getShipperProducts->quantity;
					$getProduct[$i]['ordered_qty'] = $getShipperProducts->ordered_qty;
					$getProduct[$i]['product_price1'] = $getShipperProducts->price;
					$getProduct[$i]['product_price'] = $product_price;
					$getProduct[$i]['discount'] = $getShipperProducts->discount;
					$getProduct[$i]['discounted_price'] = $discounted_price;
					$getProduct[$i]['product_type'] = $getShipperProducts->product_condition;

					if ($user_id) {

						$this->db = DB::table('ai_wishlist_details as cd');
						$this->db->select(["cd.wishlist_id"]);
						$this->db->join('ai_wishlist as c', 'c.wishlist_id', '=', 'cd.wishlist_id');
						$this->db->where(['cd.shipper_id' => $getShipperProducts->shipper_id, 'cd.product_id' => $getShipperProducts->product_id, 'c.user_id' => $user_id]);
						$result = $this->db->get()->first();

						if ($result) {
							$wishlist_id = $result->wishlist_id;
							if ($wishlist_id) {
								$getProduct[$i]['is_in_my_wish_list'] = 1;
							} else {
								$getProduct[$i]['is_in_my_wish_list'] = 0;
							}
						} else {
							$getProduct[$i]['is_in_my_wish_list'] = 0;
						}



						$this->db = DB::table('ai_cart_details as cd');
						$this->db->select(["cd.cart_id", "cd.id as cart_detail_id", "cd.product_id", "cd.quantity"]);
						$this->db->join('ai_cart as c', 'c.cart_id', '=', 'cd.cart_id');
						$this->db->where(['c.shipper_id' => $getShipperProducts->shipper_id, 'cd.product_id' => $getShipperProducts->product_id, 'c.user_id' => $user_id]);
						$result1 = $this->db->get();
						//print_r($result1);
						if (count($result1) === 0) {

							$getProduct[$i]['is_in_my_cart_list'] = 0;
							$getProduct[$i]['cart_array'] = array();
						} else {

							$cart_id = $result1[0]->cart_id;
							if ($cart_id) {
								$getProduct[$i]['is_in_my_cart_list'] = 1;
								$getProduct[$i]['cart_array'] = $result1;
							} else {
								$getProduct[$i]['is_in_my_cart_list'] = 0;
								$getProduct[$i]['cart_array'] = array();
							}
						}
					} else {
						$getProduct[$i]['is_in_my_wish_list'] = 0;
						$getProduct[$i]['is_in_my_cart_list'] = 0;
						$getProduct[$i]['cart_array'] = array();
					}
				} else {
					$getProduct[$i]['shipper_id'] = null;
					$getProduct[$i]['product_id'] = null;
					$getProduct[$i]['product_price'] = null;
					$getProduct[$i]['discount'] = null;
					$getProduct[$i]['discounted_price'] = null;
					$getProduct[$i]['product_type'] = null;
					$getProduct[$i]['category_id'] = null;
					$getProduct[$i]['category_name'] = null;
					$getProduct[$i]['category_image'] = null;
					$getProduct[$i]['rating'] = null;
					$getProduct[$i]['free_shipping'] = null;
					$getProduct[$i]['is_in_my_wish_list'] = 0;
					$getProduct[$i]['is_in_my_cart_list'] = 0;
					$getProduct[$i]['cart_array'] = array();
					$getProduct[$i]['is_deliverable'] = 0;
				}

				if ($ai_product_id_fetched) {
					$aiConditionDetails = $this->getConditionDetails($ai_product_id_fetched, $wh_account_id, $zipcode, $ai_category_id, 'AI');
					// $conditionDetails[$ai_product_id_fetched] = $aiConditionDetails;
					$getProduct[$i]['AI_product_has_store'] = $aiConditionDetails;
				}
			}
			$i++;
		}
		//echo "<pre>"; print_r($getProduct);  die;	 
		$getProduct = array_values($getProduct);

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getMasterProducts' => $getProduct,
				// 'conditionDetails' => $conditionDetails,
			]
		]);
	}



	public function getMasterProductsTotalCount(Request $request)
	{

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}
		if (isset($request->wh_account_id)) {
			$wh_account_id = $request->wh_account_id;
		} else {
			$wh_account_id = "";
		}
		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}
		if (isset($request->product_id)) {
			$product_id = $request->product_id;
		} else {
			$product_id = "";
		}


		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}
		$query = DB::table('ai_product AS p');

		$query->select('p.*', 'wp.product_type', 'wp.product_condition');

		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});

		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});

		//$query->join("wh_provider_zipcode as pz",function($join){$join->on("pz.wh_account_id","=","wp.wh_account_id") ; }); 

		$query->where([
			['p.status', '=', 1]
		]);

		//$query->where([
		//		['wp.status', '=', 'Y']
		//	]);

		if ($upc) {
			$query->where([
				['p.upc', '=', $upc]
			]);
		}


		if ($wh_account_id) {
			$query->where([
				['wp.wh_account_id', '=', $wh_account_id]
			]);
		}

		if ($ai_category_id) {
			$query->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query->where([
				['p.ai_product_id', '=', $ai_product_id]
			]);
		}

		if ($product_id) {
			$query->where([
				['wp.id', '=', $product_id]
			]);
		}

		//if($zipcode) { 	$query->where([ ['pz.zipcode', '=', $zipcode] 	]); 	}

		$query->where([
			['wp.product_type', '!=', 'ECOM']
		]);
		$query->where([
			['wp.status', '!=', 'N']
		]);

		$query->Where(function ($query) use ($search_string) {
			$query->where('p.ai_product_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.upc', 'LIKE', '%' . $search_string . '%')
				->orWhere('p.title', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('p.description', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.brand', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.model', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.color', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.size', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.dimension', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.weight', 'LIKE', '%'.$search_string.'%')	
				//->orWhere('p.category', 'LIKE', '%'.$search_string.'%')	
				->orWhere('c.name', 'LIKE', '%' . $search_string . '%')
				//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%')
			;
		});



		$query->groupBy(DB::raw('p.ai_product_id'));
		$query->orderBy("p.ai_product_id", "DESC");


		$getMasterProducts = $query->get();


		########## ecomm  prd add ###

		$query2 = DB::table('oc_product AS p');

		$query2->select('p.*', 'ac.*',	DB::raw("round((p.price) - ( (p.discount/100) * (p.price) ),2 ) as discounted_price"));

		$query2->join("wh_producttoshipper as ac", function ($join) {
			$join->on("ac.ai_product_id", "=", "p.product_id");
		});

		$query2->where([
			['ac.product_type', '=', 'ECOM']
		]);
		$query2->where([
			['ac.status', '!=', 'N']
		]);

		if ($product_id) {
			$query2->where([
				['ac.id', '=', $product_id]
			]);
		}

		if ($upc) {
			$query2->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($wh_account_id) {
			$query2->where([
				['ac.wh_account_id', '=', $wh_account_id]
			]);
		}

		if ($ai_category_id) {
			$query2->where([
				['ac.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query2->where([
				['p.product_id', '=', $ai_product_id]
			]);
		}
		$query2->where([
			['ac.quantity', '>', 0]
		]);
		$getMasterProducts_eccom = $query2->get();

		// die;

		if ($getMasterProducts_eccom) {
			//$combinedResults = $getMasterProducts->concat($getMasterProducts_eccom);
			$combinedResults = $getMasterProducts;
		} else {
			$combinedResults = $getMasterProducts;
		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => $combinedResults
		]);
	}

	public function getShipperOrderslist(Request $request)
	{
		$wh_account_id = $request->wh_account_id;

		$page = $request->page;  //1 , 2
		$items = $request->items; //20 , 20 

		if (@$request->web == "web") {
			$data['limit1'] =	$page;
		} else {
			$data['limit1'] = (($page * $items) - $items); //(($page * $items) - $items);		
		}
		$data['limit2'] = $items;

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'getShipperOrders' => 0
				]
			]);
		}

		if (isset($request->day)) {
			$day = $request->day;
		} else {
			$day = "";
		}

		$search_string = $request->search_string;
		$type = $request->type;



		//DB::enableQueryLog(); 

		$query = DB::table('wh_shipper_order AS o');

		$query->select('o.*');

		$query->join("wh_shipper_order_product as op", function ($join) {
			$join->on("op.order_id", "=", "o.id");
		});



		#############
		$query->where(function ($query)  use ($wh_account_id, $type) {




			if ($type) {

				if ($type == 'Pending') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'N')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Accepted') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Packed') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Shipped') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Delivered') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Cancelled') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'Y');
				}

				if ($type == 'Dashboard') {
					$query->where('o.shipper_id', '=', $wh_account_id)->where('o.order_reference', '!=', 'POS')
						->where('o.cancelled', '!=', 'Y');
				}
			} else {

				$query->where([['o.shipper_id', '=', $wh_account_id]]);

				//->where('o.order_reference', '!=', 'POS')

			}
		})->Where(function ($query) use ($search_string) {
			$query->where('o.id', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.total_amount', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.order_status_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.order_date', 'LIKE', '%' . $search_string . '%');
		});
		if (@$day) {
			$query->whereRaw('DATE(o.order_date) > DATE_SUB(CURDATE(), INTERVAL ' . $day . ' DAY)');
		}
		#############


		$query->groupBy(DB::raw('o.id'));
		$query->orderBy("o.id", "DESC");
		$query->offset($data['limit1']);
		$query->limit($data['limit2']);




		$getShipperOrders = $query->get();
		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'orders' => $getShipperOrders
			]
		]);
	}

	public function ai_orders_OrderStatus(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$day = $request->day;


		if ($wh_account_id) {

			$orderStatus = 'All';
			$AllOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);


			$orderStatus = 'Shipped';
			$ShippedOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);


			$orderStatus = 'Pending';
			$PendingOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);


			$orderStatus = 'Accepted';
			$AcceptedOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);

			$orderStatus = 'Packed';
			$PackedOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);

			$orderStatus = 'Delivered';
			$DeliveredOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);

			$orderStatus = 'Cancelled';
			$CancelledOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);

			$orderStatus = 'Intransit';
			$IntransitOrder  = $this->get_ai_orders_OrderStatus($wh_account_id, $orderStatus, $day);


			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Total fulfill Order',
				'data' => [
					'Total' => $AllOrder,
					'Shipped' => $ShippedOrder,
					'Pending' => $PendingOrder,
					'Accepted' => $AcceptedOrder,
					'Packed' => $PackedOrder,
					'Cancelled' => $CancelledOrder,
					'Intransit' => $IntransitOrder,
					'Delivered' => $DeliveredOrder
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'wh_account_id can not be empty!',
				'data' => [
					'totalInboundOrder' => 0
				]
			]);
		}
	}


	public function get_ai_orders_OrderStatus($wh_account_id, $type, $day)
	{

		// echo $type;
		//DB::enableQueryLog();  

		$query = DB::table('wh_shipper_order AS o');

		$query->select(
			DB::raw("COUNT(o.id) as totalorder")
		);

		$query->where(function ($query)  use ($wh_account_id, $type) {




			if ($type) {

				if ($type == 'Pending') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'N')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Accepted') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Packed') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Shipped') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Delivered') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Cancelled') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'Y');
				}
				if ($type == 'Intransit') {
					$query->where(['o.shipper_id' => $wh_account_id, 'o.cancelled' => 'N', 'o.delivered' => 'N', 'o.accepted' => 'Y']);
				}
				if ($type == 'All') {
					$query->where([['o.shipper_id', '=', $wh_account_id]]);
				}
			}
		});

		// $query->where('o.shipper_id', '=', $wh_account_id); 



		$query->whereRaw('DATE(o.order_date) > DATE_SUB(CURDATE(), INTERVAL ' . $day . ' DAY)');




		$sub = $query->get()->first();
		// echo	$sub = $query->toSql(); die;

		//dd(DB::getQueryLog()); // Show results of log
		return	$totalOrder =   $sub->totalorder;
	}



	public function getShipperOrders(Request $request)
	{

		$wh_account_id = $request->wh_account_id;

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'getShipperOrders' => 0
				]
			]);
		}

		if (isset($request->day)) {
			$day = $request->day;
		} else {
			$day = "";
		}
		if (isset($request->order_id)) {
			$order_id = $request->order_id;
		} else {
			$order_id = "";
		}
		$search_string = $request->search_string;
		$type = $request->type;

		if ($type == "All") {
			$type = "";
		}

		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}
		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		//DB::enableQueryLog(); 

		$query = DB::table('wh_shipper_order AS o');

		$query->select(
			'o.*',
			'ps.product_type',
			"sotd.time",
			"sods.driver_id",
			"sods.accepted as driver_accepted",
			"sods.accepted_datetime",
			"sods.to_be_delivered_on",
			"sods.go_to_pickup",
			"sods.go_to_pickup_date_time",
			"sods.confirm_pickup",
			"sods.confirm_pickup_datetime",
			"sods.reached_at_store",
			"sods.reached_at_store_date_time",
			"sods.on_the_way_to_the_customer",
			"sods.on_the_way_to_the_customer_date_time",
			"sods.reached_at_customer",
			"sods.reached_at_customer_date_time",
			"sods.delivered as driver_delivered",
			"sods.delivered_datetime",
			"sods.driver_note",
			"sods.visible_drunk",
			"sods.package_received_by",
			"sods.delivery_proof_file_name",
			"sods.delivery_proof_file_path",
			"sods.customer_signature_file_name",
			"sods.customer_signature_file_path",
			"sods.confirm_pickup_by_driver",
			"sods.confirm_pickup_driver_datetime",
			"sotd.distance",
			"sotd.pickup_lat",
			"sotd.pickup_long",
			"sotd.drop_lat",
			"sotd.drop_long"
		);

		$query->join("wh_shipper_order_product as op", function ($join) {
			$join->on("op.order_id", "=", "o.id");
		});
		$query->join("wh_producttoshipper as ps", function ($join) {
			$join->on("ps.ai_product_id", "=", "op.ai_product_id");
		});

		$query->leftJoin("wh_shipper_order_time_distance as sotd", function ($join) {
			$join->on("sotd.order_id", "=", "o.id");
		});

		$query->leftJoin("wh_shipper_order_driver_status as sods", function ($join) {
			$join->on("sods.order_id", "=", "o.id");
		});

		$query->where(function ($query)  use ($wh_account_id, $type) {
			$query->where('o.shipper_id', '=', $wh_account_id);  //  added on 12 dec 25
			if ($type) {
	 
				if ($type == 'Pending') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'N')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Accepted') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'N')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Packed') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'N')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Shipped') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'N')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Delivered') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'N');
				}
				if ($type == 'Cancelled') {
					$query->where('o.shipper_id', '=', $wh_account_id)
						->where('o.accepted', '=', 'Y')->where('o.packed', '=', 'Y')->where('o.Shipped', '=', 'Y')->where('o.delivered', '=', 'Y')->where('o.cancelled', '=', 'Y');
				}

				if ($type == 'Intransit') {
					$query->where(['o.shipper_id' => $wh_account_id, 'o.cancelled' => 'N', 'o.delivered' => 'N', 'o.accepted' => 'Y']);
				}
			} else {
				$query->where([['o.shipper_id', '=', $wh_account_id]]);
			}
		})->Where(function ($query) use ($search_string) {
			$query->where('o.id', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.total_amount', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.order_status_id', 'LIKE', '%' . $search_string . '%')
				->orWhere('o.order_date', 'LIKE', '%' . $search_string . '%');
		});
		// if(@$day){
		// $query->whereRaw('DATE(o.order_date) > DATE_SUB(CURDATE(), INTERVAL '.$day.' DAY)');
		// }

		if ($order_id) {
			$query->where([
				['o.id', '=', $order_id]
			]);
		}

		$query->groupBy(DB::raw('o.id'));
		$query->orderBy("o.id", "DESC");;

		//$query->offset(0);
		//$query->limit(100);

		$query->offset($limit1);
		$query->limit($limit2);


		if ($order_id) {

			$getShipperOrders = $query->get();
		} else {
			$getShipperOrders = $query->get();
		}

		//dd(DB::getQueryLog()); // Show results of log
		// echo '<pre>';
		// print_r($getShipperOrders);

		$getOrder = array();
		$getOrderProduct = array();
		$i = 0;
		foreach ($getShipperOrders as $ShipperOrders) {

			$order_id = $ShipperOrders->id;
			$getOrder[$i]['order_id'] = $ShipperOrders->id;
			$getOrder[$i]['customer_id'] = $ShipperOrders->customer_id;
			$getOrder[$i]['wh_account_id'] = $ShipperOrders->shipper_id;
			$getOrder[$i]['customer_address_id'] = $ShipperOrders->customer_address_id;
			$getOrder[$i]['name'] = $ShipperOrders->name;
			$getOrder[$i]['email'] = $ShipperOrders->email;
			$getOrder[$i]['phone'] = $ShipperOrders->phone;
			$getOrder[$i]['address'] = $ShipperOrders->address;
			$getOrder[$i]['city'] = $ShipperOrders->city;
			$getOrder[$i]['state'] = $ShipperOrders->state;
			$getOrder[$i]['country'] = $ShipperOrders->country;
			$getOrder[$i]['zip_code'] =  $ShipperOrders->zip_code;
			$getOrder[$i]['total_product'] =  $ShipperOrders->total_product;
			$getOrder[$i]['total_product_quantity'] =  $ShipperOrders->total_product_quantity;
			$getOrder[$i]['order_amount'] =  $ShipperOrders->order_amount;
			$getOrder[$i]['commission'] =  $ShipperOrders->commission;
			$getOrder[$i]['tax'] = 	 $ShipperOrders->tax;
			$getOrder[$i]['total_amount'] = $ShipperOrders->total_amount;
			$getOrder[$i]['order_status_id'] = $ShipperOrders->order_status_id;
			$getOrder[$i]['payment_id'] = 	$ShipperOrders->payment_id;
			$getOrder[$i]['accepted'] = 	$ShipperOrders->accepted;
			$getOrder[$i]['packed'] = 	$ShipperOrders->packed;
			$getOrder[$i]['Shipped'] = 	$ShipperOrders->Shipped;
			$getOrder[$i]['delivered'] = 	$ShipperOrders->delivered;
			$getOrder[$i]['delivery_proof'] = 	$ShipperOrders->delivered_image;
			$getOrder[$i]['customer_signature'] = 	$ShipperOrders->delivered_sign;
			$getOrder[$i]['visible_drunk'] = 	$ShipperOrders->visible_drunk;
			$getOrder[$i]['package_received_by'] = 	$ShipperOrders->package_received_by;
			$getOrder[$i]['driver_note'] = 	$ShipperOrders->driver_note;
			$getOrder[$i]['delivered_time'] = 	$ShipperOrders->delivered_time;
			$getOrder[$i]['product_type'] = 	$ShipperOrders->product_type;
			$getOrder[$i]['cancelled'] = 	$ShipperOrders->cancelled;
			$getOrder[$i]['ship_via_label'] = 	$ShipperOrders->ship_via_label;
			$getOrder[$i]['order_date'] = 	$ShipperOrders->order_date;
			$getOrder[$i]['delivery_type'] = 	$ShipperOrders->delivery_type;
			$getOrder[$i]['date_modified'] = $ShipperOrders->date_modified;
			$getOrder[$i]['driver_id'] = $ShipperOrders->driver_id;
			$driver_id = $ShipperOrders->driver_id;


			if ($driver_id) {

				$driver = new Driver();
				$driver_order_status_data = $driver->getDriverOrderStatus(
					[
						'order_id' => $order_id,
						'driver_id' => $driver_id
					],
				);


				$driver_order_message = $driver_order_status_data['message'];
				$driver_order_status = $driver_order_status_data['driver_order_status'];

				if ($driver_order_status == 1) {
					$driver_order_status_text = 'Accepted';
				}

				if ($driver_order_status == 1) {
					$driver_order_status_text = 'Accepted';
				}

				$visible = $driver_order_status_data['visible'];
			} else {
				$driver_order_status_data['data'] = array();
				$driver_order_message  = '';
			}

			if ($ShipperOrders->cancelled == 'Y') {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Cancelled';
			} else if ($ShipperOrders->accepted == 'N') {
				$getOrder[$i]['is_accept_button'] = '1';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Pending';

				if ($getOrder[$i]['delivery_type'] == "driver") {
					if ($driver_id) {

						$getOrder[$i]['order_status'] = $driver_order_status_text;
					}
				}
			} else if ($ShipperOrders->accepted == 'Y' && $ShipperOrders->packed == 'N') {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '1';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Accepted';
			} else if ($ShipperOrders->accepted == 'Y' && $ShipperOrders->packed == 'Y' && $ShipperOrders->Shipped == 'N') {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '1';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Packed';
			} else if ($ShipperOrders->accepted == 'Y' && $ShipperOrders->packed == 'Y' && $ShipperOrders->Shipped == 'Y' && $ShipperOrders->delivered == 'N') {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '1';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Shipped';
			} else if ($ShipperOrders->accepted == 'Y' && $ShipperOrders->packed == 'Y' && $ShipperOrders->Shipped == 'Y' && $ShipperOrders->delivered == 'Y') {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '0';
				$getOrder[$i]['order_status'] = 'Delivered';
			} else {
				$getOrder[$i]['is_accept_button'] = '0';
				$getOrder[$i]['is_packed_button'] = '0';
				$getOrder[$i]['is_shipped_button'] = '0';
				$getOrder[$i]['is_delivered_button'] = '0';
				$getOrder[$i]['is_contact_button'] = '1';
				$getOrder[$i]['order_status'] = 'Unknown';
			}

			if ($getOrder[$i]['delivery_type'] == "driver") {
				if ($driver_id) {

					$driver_order_message = $driver_order_status_data['message'];
					$driver_order_status = $driver_order_status_data['driver_order_status'];

					if ($driver_order_status == 1) {
						$driver_order_status_text = 'Accepted';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 2) {
						$driver_order_status_text = 'On The Way to Pickup';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 3) {
						$driver_order_status_text = 'Picked up';
						$getOrder[$i]['is_pickup_button'] = 'Y';
					} else if ($driver_order_status == 8) {
						$driver_order_status_text = 'Picked up';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 4) {
						$driver_order_status_text = 'Reached at Store';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 5) {
						$driver_order_status_text = 'On the way to deliver the order';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 6) {
						$driver_order_status_text = 'Reached at location';
						$getOrder[$i]['is_pickup_button'] = 'N';
					} else if ($driver_order_status == 7) {
						$driver_order_status_text = 'Delivered';
						$getOrder[$i]['is_pickup_button'] = 'N';
						//$getOrder[$i]['delivered'] = 'Y';
					} else {
						$getOrder[$i]['is_pickup_button'] = 'N';
					}
					$getOrder[$i]['order_status'] = $driver_order_status_text;
				} else {
					$driver_order_status_text = "Finding a delivery partner";
					$getOrder[$i]['is_pickup_button'] = 'N';
					$getOrder[$i]['order_status'] = $driver_order_status_text;
				}
			} else {
				$getOrder[$i]['is_pickup_button'] = 'N';
			}


			//DB::enableQueryLog(); 
			if ($ShipperOrders->product_type != "ECOM") {
				$query1 = DB::table('wh_shipper_order_product AS op');

				$query1->select('op.*', 'ap.ai_product_id', 'ap.upc as upc', 'wp.id as product_id', 'wp.wh_account_id', 'wp.price', 'op.quantity', 'wp.sku', 'wp.discount', 'wp.ai_category_id', 'wp.radius', 'c.name as ai_category_name', 'wp.product_variation', 'wp.variation_type', 'wp.parent_product_id', 'wp.variation_category_name', 'wp.variation_name_value', 'wp.event_location', 'wp.event_date_time', 'ap.images as main_image', 'wp.product_type', DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price"), 'o.booking_id', 'sa.*', 'ps.*');

				$query1->join("wh_shipper_order as o", function ($join) {
					$join->on("o.id", "=", "op.order_id");
				});

				$query1->join("wh_producttoshipper as wp", function ($join) {
					$join->on("wp.id", "=", "op.product_id");
				});
				$query1->join("ai_product as ap", function ($join) {
					$join->on("ap.ai_product_id", "=", "op.ai_product_id");
				});
				$query1->join("ai_category as c", function ($join) {
					$join->on("wp.ai_category_id", "=", "c.id");
				});
				$query1->leftjoin("wh_store_appointments as sa", function ($join) {
					$join->on("sa.id", "=", "o.booking_id");
				});

				$query1->leftjoin("wh_provider_services as ps", function ($join) {
					$join->on("ps.id", "=", "sa.store_provider_id");
				});

				$query1->where([
					['op.order_id', '=', $ShipperOrders->id]
				]);

				$getShipperOrdersProdcts = $query1->get();
			} else if ($ShipperOrders->product_type == "ECOM") {
				$query1 = DB::table('wh_shipper_order_product AS op');

				$query1->select(
					'op.*',
					'ap.product_id as ai_product_id',
					'ap.upc as upc',
					'wp.id as product_id',
					'wp.wh_account_id',
					'wp.price',
					'op.quantity',
					'wp.sku',
					'wp.discount',
					'wp.ai_category_id',
					'wp.radius',
					'c.name as ai_category_name',
					'wp.product_variation',
					'wp.variation_type',
					'wp.parent_product_id',
					'wp.variation_category_name',
					'wp.variation_name_value',
					'wp.event_location',
					'wp.event_date_time',
					'ap.image as main_image',
					'wp.product_type',
					DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")
				);

				$query1->join("wh_producttoshipper as wp", function ($join) {
					$join->on("wp.id", "=", "op.product_id");
				});

				$query1->join("oc_product as ap", function ($join) {
					$join->on("ap.product_id", "=", "op.ai_product_id");
				});

				$query1->join("ai_category as c", function ($join) {
					$join->on("wp.ai_category_id", "=", "c.id");
				});

				$query1->where([
					['op.order_id', '=', $ShipperOrders->id]
				]);

				$getShipperOrdersProdcts = $query1->get();
			}

			//dd(DB::getQueryLog()); // Show results of log

			$j = 0;
			foreach ($getShipperOrdersProdcts as $ShipperOrdersProdcts) {

				$getOrderProduct[$j]['order_product_id'] = $ShipperOrdersProdcts->id;
				$getOrderProduct[$j]['upc'] = $ShipperOrdersProdcts->upc;
				$getOrderProduct[$j]['order_id'] = $ShipperOrdersProdcts->order_id;
				$product_id = $ShipperOrdersProdcts->product_id;
				$getOrderProduct[$j]['product_id'] = $ShipperOrdersProdcts->product_id;
				$getOrderProduct[$j]['title'] = $ShipperOrdersProdcts->title;
				$getOrderProduct[$j]['image'] = $ShipperOrdersProdcts->main_image;
				$getOrderProduct[$j]['images'] = $ShipperOrdersProdcts->main_image;
				$getOrderProduct[$j]['model'] = $ShipperOrdersProdcts->model;
				$getOrderProduct[$j]['quantity'] = $ShipperOrdersProdcts->quantity;
				$getOrderProduct[$j]['price'] = $ShipperOrdersProdcts->price;
				$getOrderProduct[$j]['total_price'] = $ShipperOrdersProdcts->total_price;
				$getOrderProduct[$j]['added_date'] = $ShipperOrdersProdcts->added_date;
				$getOrderProduct[$j]['modified_date'] = $ShipperOrdersProdcts->modified_date;
				$getOrderProduct[$j]['ai_product_id'] = $ShipperOrdersProdcts->ai_product_id;
				$getOrderProduct[$j]['sku'] = $ShipperOrdersProdcts->sku;
				$getOrderProduct[$j]['discount'] = $ShipperOrdersProdcts->discount;
				$getOrderProduct[$j]['ai_category_id'] = $ShipperOrdersProdcts->ai_category_id;
				$getOrderProduct[$j]['radius'] = $ShipperOrdersProdcts->radius;
				$getOrderProduct[$j]['ai_category_name'] = $ShipperOrdersProdcts->ai_category_name;
				$getOrderProduct[$j]['discounted_price'] = $ShipperOrdersProdcts->discounted_price;
				$getOrderProduct[$j]['product_type'] = $ShipperOrdersProdcts->product_type;
				$getOrderProduct[$j]['product_variation'] = $ShipperOrdersProdcts->product_variation;
				$getOrderProduct[$j]['variation_type'] = $ShipperOrdersProdcts->variation_type;
				$getOrderProduct[$j]['parent_product_id'] = $ShipperOrdersProdcts->parent_product_id;
				$getOrderProduct[$j]['variation_category_name'] = $ShipperOrdersProdcts->variation_category_name;
				$getOrderProduct[$j]['variation_name_value'] = $ShipperOrdersProdcts->variation_name_value;
				$getOrderProduct[$j]['event_location'] = $ShipperOrdersProdcts->event_location;
				$getOrderProduct[$j]['event_date_time'] = $ShipperOrdersProdcts->event_date_time;
				if (isset($ShipperOrdersProdcts->booking_id)) {
					$getOrderProduct[$j]['booking_id'] = $ShipperOrdersProdcts->booking_id;
					$getOrderProduct[$j]['provider_name'] = $ShipperOrdersProdcts->provider_name;
					$getOrderProduct[$j]['provider_image'] = $ShipperOrdersProdcts->provider_image;
					$getOrderProduct[$j]['selected_date'] = $ShipperOrdersProdcts->selected_date;
					$getOrderProduct[$j]['selected_time'] = $ShipperOrdersProdcts->selected_time;
				} else {
					$getOrderProduct[$j]['booking_id'] = "";
					$getOrderProduct[$j]['provider_name'] = "";
					$getOrderProduct[$j]['provider_image'] = "";
					$getOrderProduct[$j]['selected_date'] = "";
					$getOrderProduct[$j]['selected_time'] = "";
				}




				$getOrderProduct[$j]['label_url'] = $ShipperOrdersProdcts->label_url;


				//get location
				// $getPickedProduct = $this->getPickedProduct($data);
				//$getOrderProductLocation = $this->GetOrderLevelInfo($wh_account_id,$order_id,$product_id);   

				//echo "<pre>"; print_r($getOrderProductLocation);
				//dd(DB::getQueryLog()); // Show results of log


				$j++;
			}

			$getOrder[$i]['OrderProducts'] = $getOrderProduct;

			$i++;
		}

		//print_r($getOrder);

		///die;


		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'orders' => $getOrder
			]
		]);
	}

	public function getDeliverableZipcode(Request $request)
	{

		if (isset($request->wh_account_id)) {
			$wh_account_id = $request->wh_account_id;
		} else {
			$wh_account_id = "";

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id is not available',
				'data' => [
					'getDeliverableZipcode' => 0
				]
			]);
		}

		$provider_zipcode = DB::table('wh_provider_zipcode AS a')

			->select('a.*', 'z.city', 'z.zip', DB::raw('1 as is_selected'))
			->join('wh_zipcode as z', 'z.zip', '=', 'a.zipcode')
			->where([
				['a.wh_account_id', '=', $wh_account_id],
				//['a.zipcode', '=', $zip]  
			])

			->get();

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getDeliverableZipcode' => $provider_zipcode
			]
		]);
	}

	public function updateDeliverableZipcode(Request $request)
	{

		if (isset($request->wh_account_id) && isset($request->zipcode_id)) {
			$wh_account_id = $request->wh_account_id;
			$id = $request->zipcode_id;
			$estimate_time = $request->estimate_time;
		} else {
			$wh_account_id = "";

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id and Id are not available',
				'data' => [
					'updateDeliverableZipcode' => 0
				]
			]);
		}

		$affected = DB::table('wh_provider_zipcode')
			->where('id', $id)

			->update(
				[
					'estimate_time' => $estimate_time
				]
			);
		if ($affected) {

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Estimated time for zipcode has been updated.',
				'data' => [
					'updateDeliverableZipcode' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 401,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'updateDeliverableZipcode' => 0
				]
			]);
		}
	}

	public function addUpdateDeliverableZipcode(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		//$state_name = $request->state_name;
		$zips = $request->zips;
		$remove_zips = $request->removed_zips;

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'addUpdateDeliverableZipcode' => 0
				]
			]);
		}

		//Check if account id is available or not

		if (!empty($zips)) {
			foreach ($zips as $zip) {
				if ($zip) {

					$zipState =  $this->getZipStates($zip);

					if ($zipState) {

						$state_name = $zipState->state_name;

						$provider_zipcode = DB::table('wh_provider_zipcode AS a')

							->select('a.id as id')
							->where([
								['a.wh_account_id', '=', $wh_account_id],
								['a.zipcode', '=', $zip]
							])

							->get()->first();

						if (isset($provider_zipcode->id)) {
							$id = $provider_zipcode->id;
						} else {
							$id = "";
						}


						if ($id) {

							$affected1 = DB::table('wh_provider_zipcode')
								->where('id', $id)

								->update(
									[
										'wh_account_id' => $wh_account_id,
										'zipcode' => $zip,
										'state_name' => $state_name
									]
								);
						} else {

							$id = DB::table('wh_provider_zipcode')->insertGetId(
								[
									'zipcode' => $zip,
									'wh_account_id' => $wh_account_id,
									'state_name' => $state_name
								]
							);
						}
					}
				}
			}
		}

		if (!empty($remove_zips)) {

			foreach ($remove_zips as $zip) {
				if ($zip) {

					$remove = DB::table('wh_provider_zipcode')->where(['zipcode' => $zip, 'wh_account_id' => $wh_account_id])->delete();
				}
			}
		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Deliverable zip code updated',
			'data' => [
				'addUpdateDeliverableZipcode' => 1
			]
		]);

		/*else {
			
			return response()->json([
					'status' => 0,
					'code' =>402,
					'message' =>'Zip can not be empty',
					'data' => [
						'addUpdateDeliverableZipcode' => 0
					]
				]);
		} */
	}

	public function getZipStates($zip)
	{

		return $getZipStates = DB::table('wh_zipcode AS z')

			->select('z.zip', 'z.state_id', 'z.state_name')
			->where([
				['z.zip', '=', $zip],
				//['a.zipcode', '=', $zip]  
			])

			->get()->first();


		//print_r($getZipStates); die;
	}

	public function GetOrderLevelInfo($wh_account_id, $order_id, $product_ids)
	{
		//echo $wh_account_id.' __ '.$order_id.' __ '.$product_ids;
		$getOrderCartonDetailResult = DB::table('wh_assign_coordinates as ac')

			->select(
				'l.name AS level_name',
				'ac.level_id',
				'wp.name AS aisle_name',
				'wl.name AS lane_name',
				'l.maximum_weight',
				'l.maximum_volume',
				'l.modified_date as product_location_date',
				'ac.assignment_id AS wh_product_id',
				'ac.carton_weight',
				'ac.carton_volume',
				'ac.id as assign_id',
				'ac.wh_account_id',
				'ac.wh_customer_id',
				'ac.created_by_user_id as whp_user_id',
				'p.sku',
				'p.UPC',
				DB::raw("sum(ac.total_quantity) as avail_qty")



			)

			->join('wh_level as l', 'l.id', '=', 'ac.level_id')
			->join('wh_lane as wl', 'wl.id', '=', 'l.lane_id')
			->join('wh_aisle as wp', 'wp.id', '=', 'l.aisle_id')
			->join('wh_product as p', 'p.oc_product_id', '=', 'ac.assignment_id')


			->where('ac.wh_account_id', $wh_account_id)
			->where('ac.assignment_type', 'pr')

			->where('ac.assignment_id', $product_ids)

			//->whereIn('ac.assignment_id',$product_ids)							

			->groupBy(DB::raw('ac.assignment_id, ac.level_id '))
			//->get();
			->toSql();
		die;
		return $getOrderCartonDetailResult;
	}

	public function OrderStatusUpdate(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$status_type = $request->status_type;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($wh_account_id == "" || $status == "" || $order_id == "" || $status_type == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderStatusUpdate' => 0
				]
			]);
		}


		//date_default_timezone_set('UTC'); 
		//$datetime = date('Y-m-d h:i:s', time());

		$this->db = DB::table('wh_shipper_order');
		$this->db->select(['id', 'cancelled', 'order_type']);
		$this->db->where(['id' => $order_id]);
		$result = $this->db->get()->first();

		if ($result) {

			//$order_id = $result->id;
			$OrderCancelled = $result->cancelled;
			$order_type = $result->order_type;

			if ($OrderCancelled == 'N') {

				if ($status_type == 'OrderAccept') {

					$affected = DB::table('wh_shipper_order')
						->where('id', $order_id)

						->update(
							[
								'accepted' => $status,
								'accepted_time' => now()
							]
						);

					$title = 'Thank you for ordering from Anything Instantly! ';
					$message = 'Your order #' . $order_id . ' will be arriving soon 🤩';
				} else if ($status_type == 'OrderAccept_pack') {

					$affected = DB::table('wh_shipper_order')
						->where('id', $order_id)

						->update(
							[


								'accepted' => $status,
								'packed' => $status,
								'packed_time' => now()
							]
						);

					$title = 'Whopiee, order packed! 📦';
					$message = 'Your order #' . $order_id . ' is packed and ready for delivery.';
				} else if ($status_type == 'OrderPacked') {

					$affected = DB::table('wh_shipper_order')
						->where('id', $order_id)

						->update(
							[
								'packed' => $status,
								'packed_time' => now()
							]
						);

					$title = 'Whopiee, order packed! 📦';
					$message = 'Your order #' . $order_id . ' is packed and ready for delivery.';
				} else if ($status_type == 'OrderShipped') {

					$affected = DB::table('wh_shipper_order')
						->where('id', $order_id)

						->update(
							[
								'Shipped' => $status,
								'Shipped_time' => now()
							]
						);
					##############  start billing module ############
					if ($order_type == 1) {         // ECOM ORDER WITH CARRIER     // pick and pack condtion here beacuse boxes generating at shipping time

						$data['wh_account_id'] = $wh_account_id;
						$data['order_id'] = $order_id;
						$data['u_account_head_name'] = "Pick and Pack";
						$this->addSales($data);
					} else if ($order_type == 2) {  // ECOM ORDER WITHOUT CARRIER

						$data['wh_account_id'] = $wh_account_id;
						$data['order_id'] = $order_id;
						$data['u_account_head_name'] = "Pick and Pack";
						$this->addSales($data);


						$data['u_account_head_name'] = "Shipping";
						$data['order_id'] = $order_id;
						$data['wh_account_id'] = $wh_account_id;
						$this->addSales($data);
					}
					##############  end billing module ############		

					$title = 'Your order #' . $order_id . ' is on the way!😇';
					$message = 'The delivery guy has picked up your order and will be arriving soon.🤘';
				} else if ($status_type == 'OrderDelivered') {

					$visible_drunk = $request->visible_drunk;
					$package_received_by = $request->package_received_by;
					$driver_note = $request->driver_note;


					$delivery_proof = $request->file('delivery_proof');
					if (!empty($delivery_proof)  && ($delivery_proof != "undefined")) {

						if (is_dir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id) === false) {
							mkdir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id, 0777, true);
						}

						$filename = 'dproof_' . time() . $delivery_proof->getClientOriginalName();
						$extension = $delivery_proof->getClientOriginalExtension();
						$fileSize = $delivery_proof->getSize();

						$maxFileSize = 2097152;

						if ($fileSize <= $maxFileSize) {
							$location = 'AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id;
							$delivery_proof->move($location, $filename);
							$dproof_filepath = $location . "/" . $filename;
						} else {
							return response()->json([
								'status' => 0,
								'code' => 402,
								'message' => 'Delivery proof image size is too large',
								'data' => [
									'response' => '0'
								]
							]);
						}
					} else {
						return response()->json([
							'status' => 0,
							'code' => 402,
							'message' => 'Delivery proof image is not available',
							'data' => [
								'response' => '0'
							]
						]);
					}


					$customer_signature = $request->file('customer_signature');
					if (!empty($customer_signature)  && ($customer_signature != "undefined")) {

						if (is_dir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id) === false) {
							mkdir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id, 0777, true);
						}

						$filename1 = 'csign_' . time() . $customer_signature->getClientOriginalName();
						$extension1 = $customer_signature->getClientOriginalExtension();
						$fileSize1 = $customer_signature->getSize();

						$maxFileSize1 = 2097152;

						if ($fileSize1 <= $maxFileSize1) {
							$location1 = 'AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id;
							$customer_signature->move($location1, $filename1);
							//	$csign_filepath = public_path($location1."/".$filename1);
							$csign_filepath = $location1 . "/" . $filename1;
						} else {
							return response()->json([
								'status' => 0,
								'code' => 402,
								'message' => 'Signature image size is too large',
								'data' => [
									'response' => '0'
								]
							]);
						}
					} else {
						return response()->json([
							'status' => 0,
							'code' => 402,
							'message' => 'Signature image is not available',
							'data' => [
								'response' => '0'
							]
						]);
					}


					################
					$visible_drunk = $request->visible_drunk;
					$package_received_by = $request->package_received_by;
					$driver_note = $request->driver_note;

					$affected = DB::table('wh_shipper_order')
						->where('id', $order_id)

						->update(
							[
								'delivered' => $status,
								'delivered_image' => $dproof_filepath,
								'delivered_sign' => $csign_filepath,
								'visible_drunk' => $visible_drunk,
								'package_received_by' => $package_received_by,
								'driver_note' => $driver_note,
								'delivered_time' => now()
							]
						);


					if ($order_type == 1 ||  $order_type == 3) {         // ECOM and scansell ORDER WITH CARRIER  both add shipcost

						$data['order_id'] = $request->order_id;
						$data['wh_account_id'] = $wh_account_id;
						$this->addShipcost($data);
						if ($order_type == 1)  //only for ecom
						{
							######### getting product id from the shipper order product ######
							$unshipped_order_detail = $this->get_unshipped_order_detail_ordership($request->order_id);
							if (count($unshipped_order_detail) > 0) {  //echo "asd"; die;
								foreach ($unshipped_order_detail as $order_detail) {

									$update_order_product_ecom = $this->update_order_product_ecom($order_detail);
								}
							} else {
								return response()->json([
									'status' => 0,
									'code' => 403,
									'message' => 'please send correct order id!',
									'data' => [
										'mark_as_ship' => ''
									]
								]);
							}


							######### getting product id from the shipper order product ######	
						}
						if ($order_type == 3  || $order_type == 4) {
							######### getting product id from the shipper order product ######
							$unshipped_order_detail = $this->get_unshipped_order_detail_ordership($request->order_id);
							if (count($unshipped_order_detail) > 0) {  //echo "asd"; die;
								foreach ($unshipped_order_detail as $order_detail) {

									$update_order_product_ai = $this->update_order_product_ai($order_detail);
								}
							} else {
								return response()->json([
									'status' => 0,
									'code' => 403,
									'message' => 'please send correct order id!',
									'data' => [
										'mark_as_ship' => ''
									]
								]);
							}


							######### getting product id from the shipper order product ######		

						}
					} else if ($order_type == 2) {  // ECOM ORDER WITHOUT CARRIER

						######### getting product id from the shipper order product ######
						$unshipped_order_detail = $this->get_unshipped_order_detail_ordership($request->order_id);
						if (count($unshipped_order_detail) > 0) {  //echo "asd"; die;
							foreach ($unshipped_order_detail as $order_detail) {

								$update_order_product_ecom = $this->update_order_product_ecom($order_detail);
							}
						} else {
							return response()->json([
								'status' => 0,
								'code' => 403,
								'message' => 'please send correct order id!',
								'data' => [
									'mark_as_ship' => ''
								]
							]);
						}


						######### getting product id from the shipper order product ######

						$data['u_account_head_name'] = "Delivery";
						$data['order_id'] = $request->order_id;
						$data['wh_account_id'] = $wh_account_id;
						$this->addSales($data);
					}

					$title = 'Order Delivered 🤗';
					$message = 'We hope you enjoyed ordering from Anything Instantly, mind taking a moment to let us know how it went?';
				} else {
					//wrong order status type

					return response()->json([
						'status' => 0,
						'code' => 403,
						'message' => 'Send correct order status type!',
						'data' => [
							'OrderStatusUpdate' => 0
						]
					]);
				}
			} else {
				return response()->json([
					'status' => 0,
					'code' => 406,
					'message' => 'Order has cancelled by user!',
					'data' => [
						'OrderStatusUpdate' => 0
					]
				]);
			}
		} else {
			return response()->json([
				'status' => 0,
				'code' => 405,
				'message' => 'Order id is not available!',
				'data' => [
					'OrderStatusUpdate' => 0
				]
			]);
		}

		if ($affected) {

			$query = DB::table('wh_shipper_order AS o');
			$query->select('o.customer_id as user_id', 'au.androidDeviceToken', 'au.iosDeviceToken', 'au.email as customer_email', 'au.country_code as customer_country_code', 'au.phone as customer_phone', 'au.name as customer_name');
			$query->join("ai_users as au", function ($join) {
				$join->on("au.id", "=", "o.customer_id");
			});
			$query->where([['o.id', '=', $order_id]]);
			$getOrderDetail = $query->get()->first();

			//$data['wh_account_id'] = $wh_account_id;
			$data['title'] = $title;
			$data['message'] = $message;
			$data['user_id'] = $getOrderDetail->user_id;
			$data['androidDeviceToken'] = $getOrderDetail->androidDeviceToken;
			$data['iOSdeviceToken'] = $getOrderDetail->iosDeviceToken;
			$data['customer_name'] = $getOrderDetail->customer_name;
			$data['customer_email'] = $getOrderDetail->customer_email;
			$data['customer_phone'] = $getOrderDetail->customer_country_code . $getOrderDetail->customer_phone;
			$data['order_id'] = $order_id;
			$data['app'] = 'anything';

			$to_array = [];
			$to_array[] = $data['customer_email'];

			$from_arr = [
				'name' => 'Team AnythingInstantly',
				'email' => 'info@shipting.com',
			];


			$sendAnythingNotification = $this->sendAnythingNotification($data);
			$sendEmail = $this->sendMail($to_array, $from_arr, $title, $message, $data['customer_name']);
			//$sendEmail = $this->sendSMS($data['customer_phone'], $message,$data['customer_name']);


			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Order status has been updated!',
				'data' => [
					'OrderStatusUpdate' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 401,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'OrderStatusUpdate' => 0
				]
			]);
		}
	}
	public function update_order_product_ai($shipping_info)
	{

		$wh_account_id = $shipping_info->wh_account_id;
		$qty_shipped = $shipping_info->shipped_qty;  //check
		$QuantityOrdered = $shipping_info->QuantityOrdered;  //check
		$order_product_id = $shipping_info->order_item_id;  //

		// $ofd_id = $shipping_info->ofd_id;  //order fulfill detail id
		$wh_customer_id = $shipping_info->wh_customer_id;
		$wh_product_id = $shipping_info->wh_product_id;







		##### lesss from producttoshipper ######
		$affected3 = DB::table('wh_producttoshipper')
			->where('ai_product_id', $wh_product_id)
			->where('wh_account_id', $wh_account_id)
			->where('seller_id', 0)
			->update(
				[

					'quantity' => DB::raw('quantity - ' . $QuantityOrdered . ''),

				]
			);

		##### lesss from producttoshipper ######




		return true;
	}
	public function update_order_product_ecom($shipping_info)
	{

		$wh_account_id = $shipping_info->wh_account_id;
		$qty_shipped = $shipping_info->shipped_qty;  //check
		$QuantityOrdered = $shipping_info->QuantityOrdered;  //check
		$order_product_id = $shipping_info->order_item_id;  //

		// $ofd_id = $shipping_info->ofd_id;  //order fulfill detail id
		$wh_customer_id = $shipping_info->wh_customer_id;
		$wh_product_id = $shipping_info->wh_product_id;





		$affected1 = DB::table('wh_shipper_order_product')
			->where('id', $order_product_id)

			->update(
				[

					'qty_shipped' => DB::raw('qty_shipped+' . $QuantityOrdered . ''),
					'qty_deliver' => DB::raw('qty_deliver+' . $QuantityOrdered . '')
				]
			);



		$affected3 = DB::table('wh_prd_inventory')
			->where('wh_product_id', $wh_product_id)
			->where('wh_customer_id', $wh_customer_id)
			->where('wh_account_id', $wh_account_id)

			->update(
				[

					'shipped_to_buyer_qty' => DB::raw('shipped_to_buyer_qty + ' . $QuantityOrdered . ''),
					'received_by_warehouse_qty' => DB::raw('received_by_warehouse_qty - ' . $QuantityOrdered . ''),
				]
			);

		##### lesss from producttoshipper ######
		$affected3 = DB::table('wh_producttoshipper')
			->where('ai_product_id', $wh_product_id)
			->where('wh_account_id', $wh_account_id)
			->where('seller_id', $wh_customer_id)

			->update(
				[

					'quantity' => DB::raw('quantity - ' . $QuantityOrdered . '')

				]
			);

		##### lesss from producttoshipper ######




		return true;
	}

	public function get_unshipped_order_detail_ordership($order_id)
	{

		$get_unshipped_order_detail_ordership = DB::table('wh_shipper_order as o')

			->select(
				'omp.id as order_item_id',
				'omp.quantity as QuantityOrdered',
				'omp.qty_shipped as shipped_qty',
				'omp.ai_product_id as wh_product_id',
				'o.ecom_seller_id as wh_customer_id',
				'o.shipper_id as wh_account_id'

			)

			//	->join('wh_shipper_order_product as omp', 'omp.wh_drop_order_id', '=', 'o.id')   //will see if it is based in dropship order
			->join('wh_shipper_order_product as omp', 'omp.order_id', '=', 'o.id')



			->where('omp.order_id', $order_id)



			->get();
		// ->toSql(); 
		return 	$get_unshipped_order_detail_ordership;
	}

	public function OrderAccept(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($wh_account_id == "" || $status == "" || $order_id == "") {


			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderAccept' => 0
				]
			]);
		}

		$affected = DB::table('wh_shipper_order')
			->where('id', $order_id)

			->update(
				[
					'accepted' => $status
				]
			);

		if ($affected) {

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Order Accepted Successfully!',
				'data' => [
					'OrderAccept' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'OrderAccept' => 0
				]
			]);
		}
	}

	public function OrderPacked(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($wh_account_id == "" || $status == "" || $order_id == "") {


			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderPacked' => 0
				]
			]);
		}

		$affected = DB::table('wh_shipper_order')
			->where('id', $order_id)

			->update(
				[
					'packed' => $status
				]
			);

		if ($affected) {

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Order Packed Successfully!',
				'data' => [
					'OrderPacked' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'OrderPacked' => 0
				]
			]);
		}
	}

	public function OrderShipped(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($wh_account_id == "" || $status == "" || $order_id == "") {


			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderShipped' => 0
				]
			]);
		}

		$affected = DB::table('wh_shipper_order')
			->where('id', $order_id)

			->update(
				[
					'Shipped' => $status
				]
			);

		if ($affected) {

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Order Shipped Successfully!',
				'data' => [
					'OrderShipped' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'OrderShipped' => 0
				]
			]);
		}
	}

	public function OrderDelivered(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($wh_account_id == "" || $status == "" || $order_id == "") {


			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderDelivered' => 0
				]
			]);
		} else {

			################


			$file = $request->file('file');
			if (!empty($file)  && ($file != "undefined")) {

				if (is_dir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id) === false) {
					mkdir('AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id, 0777, true);
				}

				$filename = time() . $file->getClientOriginalName();
				$extension = $file->getClientOriginalExtension();
				$fileSize = $file->getSize();

				$maxFileSize = 2097152;

				if ($fileSize <= $maxFileSize) {
					$location = 'AIDeliveryImages/' . $request->wh_account_id . '/' . $request->order_id;
					$file->move($location, $filename);
					$filepath = public_path($location . "/" . $filename);
				} else {
					return response()->json([
						'status' => 0,
						'code' => 402,
						'message' => 'File size is too large.',
						'data' => [
							'response' => '0'
						]
					]);
				}
			} else {
				$filepath = '';
			}
			################

			$affected = DB::table('wh_shipper_order')
				->where('id', $order_id)

				->update(
					[
						'delivered' => $status,
						'delivered_image' => $filepath
					]
				);

			if ($affected) {


				$query = DB::table('wh_shipper_order AS o');
				$query->select('o.customer_id as user_id', 'au.androidDeviceToken', 'au.iosDeviceToken', 'au.email as customer_email', 'au.country_code as customer_country_code', 'au.phone as customer_phone', 'au.name as customer_name');
				$query->join("ai_users as au", function ($join) {
					$join->on("au.id", "=", "o.customer_id");
				});
				$query->where([['o.id', '=', $order_id]]);
				$getOrderDetail = $query->get()->first();


				$title = 'Your order #' . $order_id . ' has been Delivered 🤗';
				$message = 'We hope you enjoyed ordering from Anything Instantly, mind taking a moment to let us know how it went?';

				//$data['wh_account_id'] = $wh_account_id;
				$data['title'] = $title;
				$data['message'] = $message;
				$data['user_id'] = $getOrderDetail->user_id;
				$data['androidDeviceToken'] = $getOrderDetail->androidDeviceToken;
				$data['iOSdeviceToken'] = $getOrderDetail->iosDeviceToken;
				$data['customer_name'] = $getOrderDetail->customer_name;
				$data['customer_email'] = $getOrderDetail->customer_email;
				$data['customer_phone'] = $getOrderDetail->customer_country_code . $getOrderDetail->customer_phone;
				$data['order_id'] = $order_id;
				$data['app'] = 'anything';

				$to_array = [];
				$to_array[] = $data['customer_email'];

				$from_arr = [
					'name' => 'Team AnythingInstantly',
					'email' => 'info@shipting.com',
				];


				$sendAnythingNotification = $this->sendAnythingNotification($data);
				$sendEmail = $this->sendMail($to_array, $from_arr, $title, $message, $data['customer_name']);
				//$sendEmail = $this->sendSMS($data['customer_phone'], $message,$data['customer_name']);




				return response()->json([
					'status' => 1,
					'code' => 200,
					'message' => 'Order Delivered Successfully!',
					'data' => [
						'OrderDelivered' => 1
					]
				]);
			} else {
				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'Something went wrong or its already updated!',
					'data' => [
						'OrderDelivered' => 0
					]
				]);
			}





			// else {
			// return response()->json([
			// 'status' => 0,
			// 'code' =>402,
			// 'message' =>'File can not be empty',
			// 'data' => [
			// 'response' => '0'	
			// ]
			// ]);
		}
	}

	public function addSetting(Request $request) {}

	public function getNearestZipcode(Request $request)
	{

		if (isset($request->wh_account_id) && isset($request->radius)) {
			$wh_account_id = $request->wh_account_id;
			$radius = $request->radius;
		} else {
			$wh_account_id = "";
			$radius = "";

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id is not available',
				'data' => [
					'nearest_zipcodes' => 0
				]
			]);
		}

		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;

			$provider_zipcode = DB::table('wh_zipcode AS z')

				->select('z.lat', 'z.lng')


				->where([
					['z.zip', '=', $zipcode],
					//['a.zipcode', '=', $zip]  
				])

				->get()->first();

			if (!isset($provider_zipcode->lat)) {

				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'Zipcode is not valid',
					'data' => [
						'nearest_zipcodes' => 0
					]
				]);
			}

			$lat = $provider_zipcode->lat;
			$long = $provider_zipcode->lng;
		} else {
			$zipcode = "";

			$provider_zipcode = DB::table('wh_warehouse_user AS u')

				->select('ua.postcode', 'z.lat', 'z.lng')

				->join("wh_warehouse_user_address as ua", function ($join) {
					$join->on("u.id", "=", "ua.warehouse_user_id");
				})
				->join("wh_zipcode as z", function ($join) {
					$join->on("z.zip", "=", "ua.postcode");
				})

				->where([
					['u.wh_account_id', '=', $wh_account_id],
					//['a.zipcode', '=', $zip]  
				])

				->get()->first();


			if (!isset($provider_zipcode->lat)) {

				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'Added zipcode is not valid',
					'data' => [
						'nearest_zipcodes' => 0
					]
				]);
			}

			$zipcode = $provider_zipcode->postcode;
			$lat = $provider_zipcode->lat;
			$long = $provider_zipcode->lng;
		}


		$longitude = (float) $long;
		$latitude = (float) $lat;
		//$radius = $radius; // in miles

		$lng_min = $longitude - $radius / abs(cos(deg2rad($latitude)) * 69);
		$lng_max = $longitude + $radius / abs(cos(deg2rad($latitude)) * 69);
		$lat_min = $latitude - ($radius / 69);
		$lat_max = $latitude + ($radius / 69);

		//echo 'lng (min/max): ' . $lng_min . '/' . $lng_max . PHP_EOL;
		//echo 'lat (min/max): ' . $lat_min . '/' . $lat_max;

		$nearest_zipcodes = DB::table('wh_zipcode AS z')

			->select('z.id', 'z.zip', 'z.city', 'z.state_name', 'z.state_id', 'z.county_name', 'z.population', 'z.density', 'z.lat', 'z.lng', 	DB::raw("(CASE WHEN pz.id='null' THEN 0 WHEN pz.id != 'null' THEN 1 ELSE 0 END) as is_selected"))

			//->leftjoin('wh_provider_zipcode as pz', 'pz.zipcode', '=', 'z.zip')

			/* ->leftJoin('wh_provider_zipcode as pz', function(JoinClause $join) use ($wh_account_id){
								$join->on('pz.zipcode', '=', 'z.zip')
								->where('pz.wh_account_id', '=', $wh_account_id);
								//->where('b.field4', '=', '1');
						}) */

			->leftJoin("wh_provider_zipcode as pz", "pz.zipcode", "=", DB::raw("z.zip and pz.wh_account_id=" . $wh_account_id))


			->whereBetween('z.lng', [$lng_min, $lng_max])
			->whereBetween('z.lat', [$lat_min, $lat_max])

			->get();

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'nearest_zipcodes' => $nearest_zipcodes
			]
		]);
	}

	public function getProductShipper(Request $request)
	{

		$wh_account_id = 'All';

		if ($wh_account_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Account Id can not be Empty',
				'data' => [
					'getShipperProducts' => 0
				]
			]);
		}

		if (isset($request->upc)) {
			$upc = $request->upc;
		} else {
			$upc = "";
		}

		if (isset($request->ai_category_id)) {
			$ai_category_id = $request->ai_category_id;
		} else {
			$ai_category_id = "";
		}

		if (isset($request->ai_product_id)) {
			$ai_product_id = $request->ai_product_id;
		} else {
			$ai_product_id = "";
		}

		if (isset($request->product_id)) {
			$product_id = $request->product_id;
		} else {
			$product_id = "";
		}

		if (isset($request->zipcode)) {
			$zipcode = $request->zipcode;
		} else {
			$zipcode = "";
		}

		//DB::enableQueryLog(); 

		$query = DB::table('ai_product AS p');

		$query->select(
			'p.ai_product_id',
			'p.upc',
			'p.images',
			'p.title',
			'wp.id as product_id',
			'wp.wh_account_id',
			'wp.price',
			'wp.quantity',
			'wp.sku',
			'wp.discount',
			'wp.ai_category_id',
			'c.name as ai_category_name',
			'pz.zipcode',

			DB::raw("round((wp.price) - ( (wp.discount/100) * (wp.price) ),2 ) as discounted_price")
		);

		$query->join("wh_producttoshipper as wp", function ($join) {
			$join->on("wp.ai_product_id", "=", "p.ai_product_id");
		});
		$query->join("ai_category as c", function ($join) {
			$join->on("wp.ai_category_id", "=", "c.id");
		});
		$query->join("wh_provider_zipcode as pz", function ($join) {
			$join->on("pz.wh_account_id", "=", "wp.wh_account_id");
		});

		if ($wh_account_id != 'All') {
			$query->where([
				['wp.wh_account_id', '=', $wh_account_id]
			]);
		} else {
		}

		if ($upc) {
			$query->where([
				['p.upc', '=', $upc]
			]);
		}

		if ($ai_category_id) {
			$query->where([
				['wp.ai_category_id', '=', $ai_category_id]
			]);
		}

		if ($ai_product_id) {
			$query->where([
				['p.ai_product_id', '=', $ai_product_id]
			]);
		}

		if ($product_id) {
			$query->where([
				['wp.id', '=', $product_id]
			]);
		}

		if ($zipcode) {
			$query->where([
				['pz.zipcode', '=', $zipcode]
			]);
		}

		//$query->groupBy(DB::raw('p.ai_product_id'));

		$query->offset(0);
		$query->limit(20);

		if ($ai_product_id || $upc) {

			//$getSellerProducts = $query->get()->first();
			$getSellerProducts = $query->get();
		} else {
			$getSellerProducts = $query->get();
		}

		//dd(DB::getQueryLog()); // Show results of log

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getSellerProducts' => $getSellerProducts
			]
		]);
	}

	public function OrderCancelled(Request $request)
	{

		//$wh_account_id = $request->wh_account_id;
		$status = $request->status;
		$order_id = $request->order_id;

		if ($status == "" || $order_id == "") {

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Please enter input values in all fields',
				'data' => [
					'OrderCancelled' => 0
				]
			]);
		}

		$affected = DB::table('wh_shipper_order')
			->where('id', $order_id)

			->update(
				[
					'cancelled' => $status,
					'cancelled_time' => now()
				]
			);

		if ($affected) {

			if ($status = "Y") {
				// create a function for cancelled product qty back to DB...
				$orderDetails = $this->orderDetails($order_id);

				foreach ($orderDetails as $orders) {

					$affected = DB::table('wh_producttoshipper')
						->where('id', $orders->product_id)
						->update([
							'ordered_qty' => DB::raw('ordered_qty-' . $orders->ordered_qty . ''),
							'total_ordered_qty' => DB::raw('total_ordered_qty-' . $orders->ordered_qty . '')
						]);
				}


				$options = array('order_id' => $order_id);

				$response = $this->refundOrder($options);

				$title = 'Order Cancelled 😅';
				$message = 'Your order #' . $order_id . ' has been cancelled by customer';

				$query = DB::table('wh_shipper_order AS o');
				$query->select('o.shipper_id as wh_account_id', 'au.androidDeviceToken', 'au.iosDeviceToken');
				$query->join("wh_warehouse_user as au", function ($join) {
					$join->on("au.wh_account_id", "=", "o.shipper_id");
				});
				$query->where([['o.id', '=', $order_id]]);
				$getOrderDetail = $query->get()->first();

				if ($getOrderDetail) {
					$data['title'] = $title;
					$data['message'] = $message;
					$data['user_id'] = $getOrderDetail->wh_account_id;
					$data['androidDeviceToken'] = $getOrderDetail->androidDeviceToken;
					$data['iOSdeviceToken'] = $getOrderDetail->iosDeviceToken;
					$data['order_id'] = $order_id;
					$data['app'] = 'shipting';
					$this->sendShiptingNotification($data);
				}
			}

			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Updated!',
				'data' => [
					'OrderCancelled' => 1
				]
			]);
		} else {
			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'Something went wrong or its already updated!',
				'data' => [
					'OrderCancelled' => 0
				]
			]);
		}
	}

	function refundOrder($data)
	{

		$this->db = DB::table('wh_shipper_order');
		$this->db->select(['id', 'order_amount', 'commission', 'tax', 'total_amount', 'payment_id']);
		$this->db->where(['id' => $data['order_id']]);
		$result = $this->db->get()->first();

		if ($result) {

			$order_amount = ($result->order_amount) * 100;
			$payment_id = $result->payment_id;
			
 
			$status = $stripe->refunds->create(['payment_intent' => $payment_id]);

			if (isset($status->id)) {
				$affected = DB::table('wh_shipper_order')
					->where('id', $data['order_id'])

					->update(
						[
							'refunded' => 'Y',
							'refunded_time' => now(),
							'shipper_payout' => 0.00
						]
					);
			} else {
				//echo "error";
			}


			//return ['status'=>1,'code'=>200,'data'=>$data,'message'=>'Rating has been added.'];

		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Oops!! Order is not available!'];
		}
	}


	function orderDetails($order_id)
	{
		$this->db = DB::table('wh_shipper_order_product as op');
		$this->db->select(
			[
				"op.id",
				"op.order_id",
				"op.product_id",
				//"wp.id as wp_prd_id",
				"op.quantity as ordered_qty",
				"op.id",
				"wp.quantity as current_qty"
			]
		);
		$this->db->join('wh_producttoshipper as wp', 'wp.id', '=', 'op.product_id');
		$this->db->leftjoin('ai_product as p', 'op.ai_product_id', '=', 'p.ai_product_id');


		$this->db->where(['op.order_id' => $order_id]);


		$result = $this->db->get();
		return $result;
	}


	public function getOfferBanner(Request $request)
	{

		//DB::enableQueryLog(); 

		$query = DB::table('ai_banners AS b');

		$query->select('b.id', 'b.name', 'b.image', 'b.status');
		$query->orderBy("b.code", "ASC");
		$getOfferBanners = $query->get();

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getOfferBanners' => $getOfferBanners
			]
		]);
	}

	public function generateRefferalCode(Request $request)
	{

		$user_id = $request['user_id'];

		$referral_code =  strtoupper(bin2hex(random_bytes(4)));

		$affected = DB::table('ai_users')
			->where('id', $user_id)

			->update(
				[
					'referral_code' => $referral_code,
					'referral_prize' => null
				]
			);

		$data = array("user_id" => $user_id, "referral_code" => $referral_code);

		if ($affected) {
			return ['status' => 1, 'code' => 200, 'data' => $data, 'message' => 'Referral code generated.'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Oops!! Please try again!'];
		}
	}

	public function checkRefferalCode22(Request $request)
	{

		$user_id = $request['user_id'];
		$referral_code = $request['referral_code'];
		$date_start = date('Y-m-d');

		$date_end = date('Y-m-d', strtotime('15 days'));
		$referral_coupon_code =  wordwrap(strtoupper(bin2hex(random_bytes(8))), 4, "-", true);
		//echo wordwrap('123456789123456789', 3, "-", true);

		$query = DB::table('ai_users AS u');

		$query->select('u.id', 'u.referral_code', 'u.referral_prize');
		$query->where([['u.referral_code', '=', $referral_code]]);

		$getReferralCode = $query->get()->first();

		if (isset($getReferralCode->id)) {

			//create a coupon for  "$getReferralCode->id"

			$insert = DB::table('oc_coupon')->insertGetId(
				[
					'name' => $referral_code,
					'code' => $referral_coupon_code,
					'type' => 'S',
					'discount' => 100,
					'total' => 10,
					'min_amount' => 1,
					'date_start' => $date_start,
					'date_end' => $date_end,
					'uses_customer' => $getReferralCode->id,
					'status' => 1,
					'date_added' => $date_start

				]
			);

			DB::table('ai_referral_code_history')
				->insert(
					[
						'referral_user_id' => $getReferralCode->id,
						'referred_user_id' => $user_id,
						'referral_code' => $getReferralCode->referral_code,
						'referral_prize' => $getReferralCode->referral_prize,
						'date_added' => now(),
					]
				);



			$data = array("referral_user_id" => $getReferralCode->id, "referral_code" => $referral_code, "referred_user_id" => $user_id, "referral_prize" => $getReferralCode->referral_prize);

			return ['status' => 1, 'code' => 200, 'data' => $data, 'message' => 'Referral code works'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Referral code is not correct'];
		}
	}

	public function checkRefferalCode(Request $request)
	{

		$referral_code = $request['referral_code'];

		$query = DB::table('ai_users AS u');

		$query->select('u.id', 'u.referral_code', 'u.referral_prize');
		$query->where([['u.referral_code', '=', $referral_code]]);

		$getReferralCode = $query->get()->first();

		if (isset($getReferralCode->id)) {

			$data = array("referral_user_id" => $getReferralCode->id, "referral_code" => $referral_code, "referral_prize" => $getReferralCode->referral_prize);

			return ['status' => 1, 'code' => 200, 'data' => $data, 'message' => 'Referral code works'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Referral code is not correct'];
		}
	}

	public function getRefferalCode(Request $request)
	{
		$user_id = $request['user_id'];

		$query = DB::table('ai_users AS u');

		$query->select('u.id', 'u.referral_code', 'u.referral_prize');
		$query->where([['u.id', '=', $user_id]]);

		$getReferralCode = $query->get()->first();

		if (isset($getReferralCode->referral_code)) {

			$data = array("referral_user_id" => $getReferralCode->id, "referral_code" => $getReferralCode->referral_code, "referral_prize" => $getReferralCode->referral_prize);

			return ['status' => 1, 'code' => 200, 'data' => $data, 'message' => 'Referral code'];
		} else {
			return ['status' => 0, 'code' => 402, 'message' => 'Doesnt have referral code. click to generate new'];
		}
	}


	public function updateServiceType(Request $request)
	{

		$wh_account_id = $request['wh_account_id'];

		$query = DB::table('wh_warehouse_user AS u');

		$query->select('u.wh_account_id', 'u.scanSell', 'u.fulfillment', 'u.localDelivery');
		$query->where([['u.wh_account_id', '=', $wh_account_id]]);

		$getServiceTypes = $ServiceType = $query->get()->first();

		$scanSell = $request->scanSell;
		$fulfillment = $request->fulfillment;
		$localDelivery = $request->localDelivery;
		//$scanSell = $getServiceTypes->scanSell;
		//$fulfillment = $getServiceTypes->fulfillment;
		//$localDelivery = $getServiceTypes->localDelivery;

		$affected = DB::table('wh_warehouse_user')
			->where('wh_account_id', $wh_account_id)

			->update(
				[
					'scanSell' => $scanSell,
					'fulfillment' => $fulfillment,
					'localDelivery' => $localDelivery
				]
			);



		return ['status' => 1, 'code' => 200, 'data' => array("wh_account_id" => $wh_account_id, "scanSell" => $scanSell,         "fulfillment" => $fulfillment, "localDelivery" => $localDelivery), 'message' => 'Service Updated'];
	}

	public function getServiceType(Request $request)
	{

		$wh_account_id = $request['wh_account_id'];

		$query = DB::table('wh_warehouse_user AS u');

		$query->select('u.wh_account_id', 'u.scanSell', 'u.fulfillment', 'u.localDelivery');
		$query->where([['u.wh_account_id', '=', $wh_account_id]]);

		$getServiceTypes = $ServiceType = $query->get()->first();

		if ($getServiceTypes) {

			return ['status' => 1, 'code' => 200, 'data' => $getServiceTypes, 'message' => 'Services List'];
		} else {
			return ['status' => 0, 'code' => 402, 'data' => $getServiceTypes, 'message' => 'Something went wrong please try again'];
		}
	}

	public function updateTokenShipting(Request $request)
	{

		//$wh_account_id = $customerDetails->wh_account_id;

		if (empty($request->wh_account_id)) {
			$wh_account_id = "";

			return response()->json([
				'status' => 0,
				'code' => 402,
				'message' => 'wh_account_id can not be blank',
				'data' => [
					'updateToken' => 'Not updated'
				]
			]);
		} else {
			$wh_account_id = $request->wh_account_id;
		}

		if (empty($request->androidDeviceToken)) {
			$androidDeviceToken = "";
		} else {
			$androidDeviceToken = $request->androidDeviceToken;
		}

		if (empty($request->iosDeviceToken)) {
			$iosDeviceToken = "";
		} else {
			$iosDeviceToken = $request->iosDeviceToken;
		}


		if ($androidDeviceToken != "") {

			$affected = DB::table('wh_warehouse_user')
				->where('wh_account_id', $wh_account_id)

				->update(
					[
						'androidDeviceToken' => $androidDeviceToken
					]
				);
		}

		if ($iosDeviceToken != "") {

			$affected2 = DB::table('wh_warehouse_user')
				->where('wh_account_id', $wh_account_id)

				->update(
					[
						'iosDeviceToken' => $iosDeviceToken
					]
				);
		}

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Token Updated',
			'data' => [
				'updateToken' => 'Token Updated'
			]
		]);
	}

	public function testNotification(Request $request)
	{

		$wh_account_id = $request->wh_account_id;
		//$status_type = $request->status_type;
		//$status = $request->status;
		$order_id = $request->order_id;
		$app = $request->app;

		if ($app == "anything") {

			$query = DB::table('wh_shipper_order AS o');

			$query->select('o.customer_id as user_id', 'au.androidDeviceToken', 'au.iosDeviceToken');

			$query->join("ai_users as au", function ($join) {
				$join->on("au.id", "=", "o.customer_id");
			});


			$query->where([['o.id', '=', $order_id]]);
		} else if ($app == "shipting") {

			$query = DB::table('wh_shipper_order AS o');
			$query->select('o.shipper_id as user_id', 'au.androidDeviceToken', 'au.iosDeviceToken');
			$query->join("wh_warehouse_user as au", function ($join) {
				$join->on("au.wh_account_id", "=", "o.shipper_id");
			});
			$query->where([['o.id', '=', $order_id]]);
			$getOrderDetail = $query->get()->first();
		}
		$getOrderDetail = $query->get()->first();

		$title = 'title ' . $app;
		$message = 'message ' . $app;

		$data['wh_account_id'] = $wh_account_id;
		$data['title'] = $title;
		$data['message'] = $message;
		$data['user_id'] = $getOrderDetail->user_id;
		$data['order_id'] = $order_id;
		$data['androidDeviceToken'] = 'cu736WX1RDGOlRf5u4yj0K:APA91bGpTuYPItR_Yx0uhk4yqCK26jX2PPavswntFulDNPYZjyTD1E5st7z_UObJlmYEel71tU08YrQzoE39NLlCIVhORWUfYviIWA6JQl9sxiAARcAF6V-a-_ZFs8xdZBvgBJ1hTbYf'; //$getOrderDetail->androidDeviceToken;
		$data['iOSdeviceToken'] = $getOrderDetail->iosDeviceToken;

		//echo "<pre>"; print_r($data); die;
		if ($app == "anything") {
			$sendAnythingNotification = $this->sendAnythingNotification($data);
		} else if ($app == "shipting") {
			$sendShiptingNotification = $this->sendShiptingNotification($data);
		}
	}

	public function sendAnythingNotification($data)
	{

		$title = $data['title'];
		$message = $data['message'];
		$iOSdeviceToken = $data['iOSdeviceToken'];
		$androidDeviceToken = $data['androidDeviceToken'];
		$user_id = $data['user_id'];
		$order_id = $data['order_id'];
		$app = 'anything';

		if (isset($iOSdeviceToken)) {

			//$status = $this->sendHTTP2Push('https://api.push.apple.com', 'admin/AnythingInstantly_Prod_Push.pem', 'app.anythinginstantly.unoecom.com', '{"aps":{"alert":{"title":"'.$title.'","subtitle":"","body":"'.$message.'"},"badge":0,"sound":"default","additional_data":"Anything Notification"}}', $iOSdeviceToken,$order_id); //production

			$status = $this->sendHTTP2Push('https://api.push.apple.com', 'admin/AnythingInstantly_Dev_Push.pem', 'app.anythinginstantly.unoecom.debug.com', '{"aps":{"alert":{"title":"' . $title . '","subtitle":"","body":"' . $message . '"},"badge":0,"sound":"default","additional_data":"Anything Notification"}}', $iOSdeviceToken, $order_id);  //staging

			//echo "Response code: ".$status;
		}

		if (isset($androidDeviceToken)) {
			$this->AndroidNotify($androidDeviceToken, $user_id, $title, $message, $order_id, $app);
		}
	}

	public function sendShiptingNotification($data)
	{

		$title = $data['title'];
		$message = $data['message'];
		$iOSdeviceToken = $data['iOSdeviceToken'];
		$androidDeviceToken = $data['androidDeviceToken'];
		$user_id = $data['user_id'];
		$order_id = $data['order_id'];
		$app = 'shipting';

		if (isset($iOSdeviceToken)) {

			//$status = $this->sendHTTP2Push('https://api.push.apple.com', 'admin/shipting/Shipting_Prod_Push_Certificates.pem', 'app.shipting.unoecom.com', '{"aps":{"alert":{"title":"'.$title.'","subtitle":"","body":"'.$message.'"},"badge":0,"sound":"default","additional_data":"Shipting Notification"}}', $iOSdeviceToken,$order_id);   //production

			$status = $this->sendHTTP2Push('https://api.push.apple.com', 'admin/shipting/Shipting_Dev_Push_Certificates.pem', 'app.shipting.unoecom.com.debug', '{"aps":{"alert":{"title":"' . $title . '","subtitle":"","body":"' . $message . '"},"badge":0,"sound":"default","additional_data":"Shipting Notification"}}', $iOSdeviceToken, $order_id);   // staging

			//echo "Response code: ".$status;
		}

		if (isset($androidDeviceToken)) {
			$this->AndroidNotify($androidDeviceToken, $user_id, $title, $message, $order_id, $app);
		}
	}

	public function AndroidNotify($token, $user_id, $title, $message, $order_id, $app)
	{

		if ($app == 'shipting') {

			$API_ACCESS_KEY = 'AAAAzuRal-0:APA91bEsPBoqdP61L73igH1ZYtiz1I5lCYWl7WKJRaSde0en_Na0lmz55SNWWQMJzBYxL6sDcletDHOXDnw9d14xJMTr1aXYqDwjbO2AIHy8koU8zrnYVSXk5YnDiASjNLuH6hoDpybC';
		} else if ($app == 'anything') {

			$API_ACCESS_KEY = 'AAAAO5yC63Q:APA91bGAU5VoC9vMkelDXlvQRctBt2Nb6S8AOxoYIu6w0XpwncHka4QCpZgsG_dUdz5O9qFqULAjTBXSywAaGFvNmy9nXEe8DSwVcpZpYQFsVLuAu_FmvbrCW8XwsKeewy9iHIpghoMk';
		}

		$fcmUrl = 'https://fcm.googleapis.com/fcm/send';

		$extraNotificationData = [
			"order_id" => $order_id,
			"title" => $title,
			"description" => $message
			//"userOfferId" =>$user_id
		];

		$fcmNotification = [
			//'registration_ids' => $tokenList, //multple token array
			'to' => $token, //single token
			'data' => $extraNotificationData
		];

		$headers = [
			'Authorization: key=' . $API_ACCESS_KEY,
			'Content-Type: application/json'
		];


		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $fcmUrl);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fcmNotification));
		$result = curl_exec($ch);
		curl_close($ch);
		//echo "<pre>";

		//print_r( $result);


	}

	public function sendHTTP2Push($http2_server, $apple_cert, $app_bundle_id, $message, $token, $order_id)
	{
		if (!defined('CURL_HTTP_VERSION_2_0')) {
			define('CURL_HTTP_VERSION_2_0', 3);
		}
		$http2ch = curl_init();
		curl_setopt($http2ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);

		curl_setopt_array($http2ch, array(
			CURLOPT_URL => "{$http2_server}/3/device/{$token}",
			CURLOPT_PORT => 443,
			CURLOPT_HTTPHEADER => array("apns-topic: {$app_bundle_id}"),
			CURLOPT_POST => TRUE,
			CURLOPT_POSTFIELDS => $message,
			CURLOPT_RETURNTRANSFER => TRUE,
			CURLOPT_TIMEOUT => 30,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_SSLCERT => realpath($apple_cert),
			CURLOPT_HEADER => 1
		));

		$result = curl_exec($http2ch);
		//var_dump($result);
		if ($result === FALSE) {
			//throw new Exception('Curl failed with error: ' . curl_error($http2ch));
		}

		$status = curl_getinfo($http2ch, CURLINFO_HTTP_CODE);
		//return $status;

		curl_close($http2ch);
	}


	public function getTotalNearestStore(Request $request)
	{
		if (isset($request->address)) {
			$address = $request->address;
			if (isset($address['address_id'])) {
				$address_id = $address['address_id'];
				$address_type = "address_id";
				$zip = "";
			} else {

				$address_id = "";

				if (isset($address['zip'])) {

					$zip = $address['zip'];

					if (isset($address['street'])) {
						$street = $address['street'];

						$state = $address['state'];
						if (isset($address['city'])) {
							$city = $address['city'];
							$address_type = "current_location";
						} else {
							$city = "";
						}
					} else {
						$address_type = "zip";
					}
				} else {

					$zip = "";
					$address_type = "";

					return response()->json([
						'status' => 0,
						'code' => 408,
						'message' => 'Something went wrong with address!',
						'data' => [
							'getNearestStore' => []
						]
					]);
				}
			}
		} else {
			return response()->json([
				'status' => 0,
				'code' => 407,
				'message' => 'Something wrong with address!',
				'data' => [
					'getNearestStore' => []
				]
			]);
		}



		if (isset($request->store_type_id)) {
			$store_type_id = $request->store_type_id;
		} else {
			$store_type_id = "";
		}

		if (isset($request->user_id)) {
			$user_id = $request->user_id;
		} else {
			$user_id = "";
		}

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}


		if ($address_type == "zip") {

			$this->db = DB::table('wh_zipcode as z');
			$this->db->select(['z.lat as lat1', 'z.lng as lon1', 'z.state_name as state', 'z.city']);

			$this->db->where(['z.zip' => $zip]);
			$zipcodeDetails = $this->db->get()->first();

			if (isset($zipcodeDetails->city)) {

				$street = "";
				$state = $zipcodeDetails->state;
				$city = $zipcodeDetails->city;
			} else {
				return response()->json([
					'status' => 1,
					'code' => 406,
					'message' => 'Something went wrong!',
					'data' => [
						'getNearestStore' => []
					]
				]);
			}
		}

		//DB::enableQueryLog(); 

		$this->db = DB::table('wh_warehouse_user as u');
		$this->db->select(["u.wh_account_id", "ua.company as store_name", "ua.company_icon as store_icon", "company_type as store_type", "ua.address_1", "ua.city", "ua.postcode as zipcode", 'z.state_name as store_state_name', 'z.lat as lat2', 'z.lng as lon2', 's.LargeImage as store_type_icon', DB::raw("'' as timetaking")]);
		$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
		$this->db->join('wh_zipcode as z', 'ua.postcode', '=', 'z.zip');
		$this->db->join('ai_store_types as s', 's.id', '=', 'ua.company_type');

		//$this->db->where(['ua.company'=>""]);
		if ($store_type_id) {
			$this->db->where(['ua.company_type' => $store_type_id, 'u.approved' => 1]);
		} else {
			$this->db->where(['u.approved' => 1]);
		}
		$this->db->where('ua.company', '!=', '');
		$this->db->whereRaw('ua.company is not null');
		$this->db->Where(function ($query) use ($search_string) {

			$query->where('ua.company', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.company_type', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.address_1', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('ua.city', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.postcode', 'LIKE', '%' . $search_string . '%');
			//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%') ;	
		});


		$total_nearest_store = $this->db->get();
		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Total Nearest Store List',
			'data' => [
				'getTotalNearestStore' => count($total_nearest_store),
			]
		]);
	}


	public function getNearestStore(Request $request)
	{

		if (isset($request->address)) {
			$address = $request->address;
			//echo "<pre>"; print_r($address['address_id']);

			if (isset($address['address_id'])) {
				$address_id = $address['address_id'];
				$address_type = "address_id";
				$zip = "";
			} else {

				$address_id = "";

				if (isset($address['zip'])) {

					$zip = $address['zip'];

					if (isset($address['street'])) {
						$street = $address['street'];

						$state = $address['state'];
						if (isset($address['city'])) {
							$city = $address['city'];
							$address_type = "current_location";
						} else {
							$city = "";
						}
					} else {
						$address_type = "zip";
					}
				} else {

					$zip = "";
					$address_type = "";

					return response()->json([
						'status' => 0,
						'code' => 408,
						'message' => 'Something went wrong with address!',
						'data' => [
							'getNearestStore' => []
						]
					]);
				}
			}
		} else {
			return response()->json([
				'status' => 0,
				'code' => 407,
				'message' => 'Something wrong with address!',
				'data' => [
					'getNearestStore' => []
				]
			]);
		}



		if (isset($request->store_type_id)) {
			$store_type_id = $request->store_type_id;
		} else {
			$store_type_id = "";
		}

		if (isset($request->user_id)) {
			$user_id = $request->user_id;
		} else {
			$user_id = "";
		}

		if (isset($request->search_string)) {
			$search_string = $request->search_string;
		} else {
			$search_string = "";
		}

		if (isset($request->page)) {

			$page = $request->page; //1 , 2
		} else {
			$page = "1";
		}

		if (isset($request->items)) {

			$items = $request->items; //20 , 20 
		} else {
			$items = "20";
		}

		$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

		$limit2 = $items;

		if ($address_type == "zip") {

			$this->db = DB::table('wh_zipcode as z');
			$this->db->select(['z.lat as lat1', 'z.lng as lon1', 'z.state_name as state', 'z.city']);

			$this->db->where(['z.zip' => $zip]);
			$zipcodeDetails = $this->db->get()->first();

			if (isset($zipcodeDetails->city)) {

				$street = "";
				$state = $zipcodeDetails->state;
				$city = $zipcodeDetails->city;
			} else {
				return response()->json([
					'status' => 1,
					'code' => 406,
					'message' => 'Something went wrong!',
					'data' => [
						'getNearestStore' => []
					]
				]);
			}
		}

		//DB::enableQueryLog(); 

		$this->db = DB::table('wh_warehouse_user as u');
		$this->db->select(["u.wh_account_id", "ua.company as store_name", "ua.company_icon as store_icon", "company_type as store_type", "ua.address_1", "ua.city", "ua.postcode as zipcode", 'z.state_name as store_state_name', 'z.lat as lat2', 'z.lng as lon2', 's.LargeImage as store_type_icon', DB::raw("'' as timetaking")]);
		$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
		$this->db->join('wh_zipcode as z', 'ua.postcode', '=', 'z.zip');
		$this->db->join('ai_store_types as s', 's.id', '=', 'ua.company_type');

		//$this->db->where(['ua.company'=>""]);
		if ($store_type_id) {
			$this->db->where(['ua.company_type' => $store_type_id, 'u.approved' => 1]);
		} else {
			$this->db->where(['u.approved' => 1]);
		}
		$this->db->where('ua.company', '!=', '');
		$this->db->whereRaw('ua.company is not null');
		$this->db->Where(function ($query) use ($search_string) {

			$query->where('ua.company', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.company_type', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.address_1', 'LIKE', '%' . $search_string . '%')
				//->orWhere('p.ean', 'LIKE', '%'.$search_string.'%')	
				->orWhere('ua.city', 'LIKE', '%' . $search_string . '%')
				->orWhere('ua.postcode', 'LIKE', '%' . $search_string . '%');
			//->orWhere('pz.zipcode', 'LIKE', '%'.$search_string.'%') ;	
		});


		$this->db->offset($limit1);
		$this->db->limit($limit2);
		$storename1 = $this->db->get();

		//dd(DB::getQueryLog()); // Show results of log

		$getNearestStore = array();

		$i = 0;
		foreach ($storename1 as $storelist) {


			//get exact distance using google map api
			$addressData['store_address'] = $storelist->address_1;
			$addressData['store_city'] = $storelist->city;
			$addressData['store_state'] = $storelist->store_state_name;
			$addressData['store_country'] = 'US';
			$addressData['store_zip_code'] = $storelist->zipcode;

			if ($address_id) {

				$this->db = DB::table('wh_shipper_order_address as s');
				$this->db->select(['s.address_name', 's.address', 's.city', 's.state', 's.country', 's.zip_code']);

				$this->db->where(['s.address_id' => $address_id]);
				$addressDetails = $this->db->get()->first();

				if (isset($addressDetails->address)) {
					$addressData['address'] = $addressDetails->address;
					$addressData['city'] = $addressDetails->city;
					$addressData['state'] = $addressDetails->state;
					$addressData['country'] = $addressDetails->country;
					$addressData['zip_code'] = $addressDetails->zip_code;



					$dist = $this->exactDistance($addressData);
					$distance11 = $dist['distance'];
					$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
					$time = $dist['time'];



					$totalDistance = round($distance, 2);
				} else {
					return response()->json([
						'status' => 1,
						'code' => 403,
						'message' => 'Something went wrong!',
						'data' => [
							'getNearestStore' => []
						]
					]);
				}
			} else if (isset($city)) {

				$addressData['address'] = $street;
				$addressData['city'] = $city;
				$addressData['state'] = $state;
				$addressData['country'] = 'US';
				$addressData['zip_code'] = $zip;

				$dist = $this->exactDistance($addressData);
				$distance11 = $dist['distance'];
				$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
				$time = $dist['time'];

				$totalDistance = round($distance, 2);
			} else {
				return response()->json([
					'status' => 1,
					'code' => 402,
					'message' => 'Something went wrong!',
					'data' => [
						'getNearestStore' => []
					]
				]);
			}



			if ($user_id) {
				$this->db = DB::table('ai_store_save');
				$this->db->select(["id"]);
				$this->db->where(['wh_account_id' => $storelist->wh_account_id, 'user_id' => $user_id]);
				$result = $this->db->get()->first();

				if ($result) {
					$saveStore_id = $result->id;
					if ($saveStore_id) {
						$is_saved = "Y";
					} else {
						$is_saved = "N";
					}
				} else {
					$is_saved = "N";
				}
			} else {
				$is_saved = "N";
			}


			$getNearestStore[$i]['wh_account_id'] = $storelist->wh_account_id;
			//$getNearestStore[$i]['store_type_icon'] = $storelist->store_type_icon; 
			$getNearestStore[$i]['store_name'] = $storelist->store_name;

			if (empty($storelist->store_icon)) {
				$getNearestStore[$i]['store_icon'] = $storelist->store_type_icon;
			} else {
				$protocol = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
				$url = $protocol . $_SERVER['HTTP_HOST'];
				$getNearestStore[$i]['store_icon'] = $url . '/storage/' . $storelist->store_icon;
			}
			// $getNearestStore[$i]['store_icon'] = $storelist->store_icon;    //put if else condtion here 

			$getNearestStore[$i]['store_type'] = $storelist->store_type;
			$getNearestStore[$i]['address'] = $storelist->address_1;
			$getNearestStore[$i]['city'] = $storelist->city;
			$getNearestStore[$i]['zipcode'] = $storelist->zipcode;
			$getNearestStore[$i]['timetaking'] = $time;
			$getNearestStore[$i]['totalDistance'] = $totalDistance;
			$getNearestStore[$i]['distance'] = $totalDistance . ' Miles';
			$getNearestStore[$i]['is_saved'] = $is_saved;

			$i++;
		}
		$getNearestStore1 = []; //usort($getNearestStore, fn($a, $b) => $a['totalDistance'] <=> $b['totalDistance']);

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Nearest Store List',
			'data' => [
				'getNearestStore' => $getNearestStore
			]
		]);
	}

	public function getStoreList(Request $request)
	{

		//DB::enableQueryLog(); 

		$query = DB::table('ai_store_types AS c');

		$query->select('c.id', 'c.name', 'c.image', 'c.status');
		$query->where(['c.status' => 1]);
		$query->orderBy("c.code", "ASC");

		$getStoreList = $query->get();

		return response()->json([
			'status' => 1,
			'code' => 200,
			'message' => 'Data Fetched Successfully',
			'data' => [
				'getStoreList' => $getStoreList
			]
		]);
	}

	public function distance($lat1, $lon1, $lat2, $lon2, $unit)
	{
		// echo "gggg";die;
		if (($lat1 == $lat2) && ($lon1 == $lon2)) {
			return 0;
		} else {
			$theta = $lon1 - $lon2;
			$dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
			$dist = acos($dist);
			$dist = rad2deg($dist);
			$miles = $dist * 60 * 1.1515;
			$unit = strtoupper($unit);

			if ($unit == "K") {
				return ($miles * 1.609344);
			} else if ($unit == "N") {
				return ($miles * 0.8684);
			} else {
				return $miles;
			}
		}
	}

	public function exactDistance($addressData)
	{

		$coordinates1 = $this->get_coordinates($addressData['store_city'], $addressData['store_address'], $addressData['store_state']);
		$coordinates2 = $this->get_coordinates($addressData['city'], $addressData['address'], $addressData['state']);

		if (!$coordinates1 || !$coordinates2) {
			return array('distance' => 0, 'time' => 0);
		} else {
			return $dist = $this->GetDrivingDistance($coordinates1['lat'], $coordinates2['lat'], $coordinates1['long'], $coordinates2['long']);
			//echo 'Distance: <b>'.$dist['distance'].'</b><br>Travel time duration: <b>'.$dist['time'].'</b>';
		}
	}

	public function getStoreDetails($data)
	{
		//echo "<pre>"; print_r($data); die;
		//Log::info('getStoreDetails request other start');
		//Log::info($data);
		//Log::info('getStoreDetails request other end');

		if (isset($data['address'])) {
			$address = $data['address'];

			if (isset($address['address_id'])) {

				$address_id = $address['address_id'];
				$address_type = "address_id";
				$zip = "";
			} else {

				$address_id = "";

				if (isset($address['zip'])) {

					$zip = $address['zip'];

					if ($address['street']) {
						$street = $address['street'];

						$state = $address['state'];
						if (isset($address['city'])) {
							$city = $address['city'];
							$address_type = "current_location";
						} else {
							$city = "";
						}
					} else {
						$address_type = "zip";
					}
				} else {

					$zip = "";
					$address_type = "";

					return [];
				}
			}
		} else {
			return [];
		}


		$wh_account_id = $data['wh_account_id'];
		$user_id = $data['user_id'];


		if ($address_type == "zip") {

			$this->db = DB::table('wh_zipcode as z');
			$this->db->select(['z.lat as lat1', 'z.lng as lon1', 'z.state_name as state', 'z.city']);

			$this->db->where(['z.zip' => $zip]);
			$zipcodeDetails = $this->db->get()->first();

			if (isset($zipcodeDetails->city)) {

				$street = "";
				$state = $zipcodeDetails->state;
				$city = $zipcodeDetails->city;
			} else {
				return [];
			}
		}

		//DB::enableQueryLog(); 
		$this->db = DB::table('wh_warehouse_user as u');
		$this->db->select(["u.wh_account_id", "ua.company as store_name", "ua.company_icon as store_icon", "company_type as store_type", "ua.address_1", "ua.city", "ua.postcode as zipcode", 'z.state_name as store_state_name', 'z.lat as lat2', 'z.lng as lon2', 's.LargeImage as store_type_icon', DB::raw("'' as timetaking")]);
		$this->db->join('wh_warehouse_user_address as ua', 'u.id', '=', 'ua.warehouse_user_id');
		$this->db->join('wh_zipcode as z', 'ua.postcode', '=', 'z.zip');
		$this->db->join('ai_store_types as s', 's.id', '=', 'ua.company_type');

		$this->db->where(['u.wh_account_id' => $wh_account_id, 'u.approved' => 1]);

		$storelist = $this->db->get()->first();

		//dd(DB::getQueryLog()); // Show results of log
		//Log::info('Store list other start');
		//Log::info($storelist);
		//Log::info('Store list other end');
		// die;
		$addressData['store_address'] = $storelist->address_1;
		$addressData['store_city'] = $storelist->city;
		$addressData['store_state'] = $storelist->store_state_name;
		$addressData['store_country'] = 'US';
		$addressData['store_zip_code'] = $storelist->zipcode;


		if ($address_id) {

			$this->db = DB::table('wh_shipper_order_address as s');
			$this->db->select(['s.address_name', 's.address', 's.city', 's.state', 's.country', 's.zip_code']);

			$this->db->where(['s.address_id' => $address_id]);
			$addressDetails = $this->db->get()->first();

			if (isset($addressDetails->address)) {
				$addressData['address'] = $addressDetails->address;
				$addressData['city'] = $addressDetails->city;
				$addressData['state'] = $addressDetails->state;
				$addressData['country'] = $addressDetails->country;
				$addressData['zip_code'] = $addressDetails->zip_code;



				$dist = $this->exactDistance($addressData);
				$distance11 = $dist['distance'];
				$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
				$time = $dist['time'];



				$totalDistance = round($distance, 2);
			} else {
				return response()->json([
					'status' => 1,
					'code' => 403,
					'message' => 'Something went wrong!',
					'data' => [
						'getNearestStore' => []
					]
				]);
			}
		} else if (isset($city)) {

			$addressData['address'] = $street;
			$addressData['city'] = $city;
			$addressData['state'] = $state;
			$addressData['country'] = 'US';
			$addressData['zip_code'] = $zip;

			$dist = $this->exactDistance($addressData);
			$distance11 = $dist['distance'];
			$distance = (int) filter_var($distance11, FILTER_SANITIZE_NUMBER_INT);
			$time = $dist['time'];

			$totalDistance = round($distance, 2);
		} else {
			return response()->json([
				'status' => 1,
				'code' => 402,
				'message' => 'Something went wrong!',
				'data' => [
					'getNearestStore' => []
				]
			]);
		}

		if ($user_id) {
			$this->db = DB::table('ai_store_save');
			$this->db->select(["id"]);
			$this->db->where(['wh_account_id' => $storelist->wh_account_id, 'user_id' => $user_id]);
			$result = $this->db->get()->first();

			if ($result) {
				$saveStore_id = $result->id;
				if ($saveStore_id) {
					$is_saved = "Y";
				} else {
					$is_saved = "N";
				}
			} else {
				$is_saved = "N";
			}
		} else {
			$is_saved = "N";
		}

		$getStoreDetails = array();

		$getStoreDetails['wh_account_id'] = $storelist->wh_account_id;
		$getStoreDetails['store_name'] = $storelist->store_name;

		// $getNearestStore[$i]['store_icon'] = $storelist->store_icon;    //put if else condtion here 
		$getStoreDetails['store_icon'] = $storelist->store_type_icon;
		$getStoreDetails['store_type'] = $storelist->store_type;
		$getStoreDetails['address'] = $storelist->address_1;
		$getStoreDetails['city'] = $storelist->city;
		$getStoreDetails['zipcode'] = $storelist->zipcode;
		$getStoreDetails['timetaking'] = $time;
		$getStoreDetails['totalDistance'] = $totalDistance;
		$getStoreDetails['distance'] = $totalDistance . ' Miles';
		$getStoreDetails['is_saved'] = $is_saved;

		return $getStoreDetails;
	}

	public function saveStore(Request $request)
	{

		if (isset($request->wh_account_id) && isset($request->user_id)) {

			$data['wh_account_id'] = $request->wh_account_id;
			$data['user_id'] = $request->user_id;
			if (isset($request->address)) {
				$data['address'] = $request->address;
			} else {
				$data['address'] = "";

				return response()->json([
					'status' => 0,
					'code' => 407,
					'message' => 'Something went wrong with address!',
					'data' => [
						'savedStoreList' => []
					]
				]);
			}

			$is_remove = $request->is_remove;


			$this->db = DB::table('ai_store_save');
			$this->db->select(["id"]);
			$this->db->where(['wh_account_id' => $data['wh_account_id'], 'user_id' => $data['user_id']]);
			$result = $this->db->get()->first();

			if ($result) {
				$saveStore_id = $result->id;
				if ($saveStore_id) {
					if ($is_remove == "Y") {

						DB::table('ai_store_save')->where(['id' => $saveStore_id])->delete();

						$getStoreDetails = $this->getStoreDetails($data);

						return response()->json([
							'status' => 1,
							'code' => 200,
							'message' => 'Removed Successfully!',
							'data' => [
								'getStoreDetails' => $getStoreDetails
							]
						]);
					} else {
						$getStoreDetails = $this->getStoreDetails($data);
						return response()->json([
							'status' => 0,
							'code' => 402,
							'message' => 'Already Added!',
							'data' => [
								'getStoreDetails' => $getStoreDetails
							]
						]);
					}
				} else {

					if ($is_remove == "Y") {
						$getStoreDetails = $this->getStoreDetails($data);
						return response()->json([
							'status' => 0,
							'code' => 402,
							'message' => 'Match not available!',
							'data' => [
								'getStoreDetails' => $getStoreDetails
							]
						]);
					} else {
						$insertSaveStore = DB::table('ai_store_save')->insertGetId(
							[
								'wh_account_id' => $data['wh_account_id'],
								'user_id' => $data['user_id']

							]
						);
						$getStoreDetails = $this->getStoreDetails($data);
						if ($insertSaveStore) {
							return response()->json([
								'status' => 1,
								'code' => 200,
								'message' => 'Added Successfully!',
								'data' => [
									'getStoreDetails' => $getStoreDetails
								]
							]);
						} else {
							return response()->json([
								'status' => 0,
								'code' => 402,
								'message' => 'Something went wrong!',
								'data' => [
									'getStoreDetails' => $getStoreDetails
								]
							]);
						}
					}
				}
			} else {
				if ($is_remove == "Y") {
					$getStoreDetails = $this->getStoreDetails($data);
					return response()->json([
						'status' => 0,
						'code' => 402,
						'message' => 'Match not available!',
						'data' => [
							'getStoreDetails' => $getStoreDetails
						]
					]);
				} else {
					$insertSaveStore = DB::table('ai_store_save')->insertGetId(
						[
							'wh_account_id' => $data['wh_account_id'],
							'user_id' => $data['user_id']

						]
					);
					$getStoreDetails = $this->getStoreDetails($data);
					if ($insertSaveStore) {
						return response()->json([
							'status' => 1,
							'code' => 200,
							'message' => 'Added Successfully!',
							'data' => [
								'getStoreDetails' => $getStoreDetails
							]
						]);
					} else {
						return response()->json([
							'status' => 0,
							'code' => 402,
							'message' => 'Something went wrong!',
							'data' => [
								'getStoreDetails' => $getStoreDetails
							]
						]);
					}
				}
			}
		} else {

			return response()->json([
				'status' => 0,
				'code' => 401,
				'message' => 'Mandatory values can not be blank!',
				'data' => [
					'saveStore' => 0
				]
			]);
		}
	}

	public function removeSaveStore(Request $request)
	{

		if (isset($request->wh_account_id) && isset($request->user_id)) {
			$data['wh_account_id'] = $request->wh_account_id;
			$data['user_id'] = $request->user_id;

			$this->db = DB::table('ai_store_save');
			$this->db->select(["id"]);
			$this->db->where(['wh_account_id' => $data['wh_account_id'], 'user_id' => $data['user_id']]);
			$result = $this->db->get()->first();

			if ($result) {
				$saveStore_id = $result->id;
				if ($saveStore_id) {

					DB::table('ai_store_save')->where(['id' => $saveStore_id])->delete();

					return response()->json([
						'status' => 1,
						'code' => 200,
						'message' => 'Removed Successfully!',
						'data' => [
							'removeSaveStore' => $data
						]
					]);
				} else {

					return response()->json([
						'status' => 0,
						'code' => 402,
						'message' => 'Match not available!',
						'data' => [
							'removeSaveStore' => $data
						]
					]);
				}
			} else {

				return response()->json([
					'status' => 0,
					'code' => 402,
					'message' => 'Match not available!',
					'data' => [
						'removeSaveStore' => $data
					]
				]);
			}
		} else {

			return response()->json([
				'status' => 0,
				'code' => 401,
				'message' => 'Mandatory values can not be blank!',
				'data' => [
					'saveStore' => 0
				]
			]);
		}
	}

	public function savedStoreListTotal(Request $request)
	{
		if (isset($request->user_id)) {
			$data['user_id'] = $request->user_id;
			if (isset($request->address)) {
				$data['address'] = $request->address;
			} else {
				$data['address'] = "";
				return response()->json([
					'status' => 0,
					'code' => 407,
					'message' => 'Something went wrong with address!',
					'data' => [
						'savedStoreList' => []
					]
				]);
			}

			$this->db = DB::table('ai_store_save');
			$this->db->select(["id", "user_id", "wh_account_id"]);
			$this->db->where(['user_id' => $data['user_id']]);
			$result = $this->db->get();
			return response()->json([
				'status' => 1,
				'code' => 200,
				'message' => 'Total saved Stores',
				'data' => [
					'savedStoreListTotal' => count($result)
				]
			]);
		}
	}
	public function savedStoreList(Request $request)
	{

		if (isset($request->user_id)) {
			Log::info('Saved store List Start');
			Log::info($request->all());
			Log::info('Saved store List End');
			if (isset($request->page)) {

				$page = $request->page; //1 , 2
			} else {
				$page = "1";
			}

			if (isset($request->items)) {

				$items = $request->items; //20 , 20 
			} else {
				$items = "20";
			}

			$limit1 = (($page * $items) - $items); //(($page * $items) - $items);		

			$limit2 = $items;


			$data['user_id'] = $request->user_id;
			//$data['zip'] = $request->zip;

			if (isset($request->address)) {
				$data['address'] = $request->address;
			} else {
				$data['address'] = "";

				return response()->json([
					'status' => 0,
					'code' => 407,
					'message' => 'Something went wrong with address!',
					'data' => [
						'savedStoreList' => []
					]
				]);
			}

			$this->db = DB::table('ai_store_save');
			$this->db->select(["id", "user_id", "wh_account_id"]);
			$this->db->where(['user_id' => $data['user_id']]);
			$this->db->offset($limit1);
			$this->db->limit($limit2);
			$result = $this->db->get();

			if ($result) {
				$i = 0;
				foreach ($result as $storelist) {

					if ($storelist->wh_account_id) {
						$data['wh_account_id'] = $storelist->wh_account_id;

						$getStoreDetails = (object)$this->getStoreDetails($data);

						if (isset($getStoreDetails->wh_account_id)) {
							$getNearestStore[$i]['wh_account_id'] = $getStoreDetails->wh_account_id;
							$getNearestStore[$i]['store_name'] = $getStoreDetails->store_name;
							$getNearestStore[$i]['store_icon'] = $getStoreDetails->store_icon;
							$getNearestStore[$i]['store_type'] = $getStoreDetails->store_type;
							$getNearestStore[$i]['address'] = $getStoreDetails->address;
							$getNearestStore[$i]['city'] = $getStoreDetails->city;
							$getNearestStore[$i]['zipcode'] = $getStoreDetails->zipcode;
							$getNearestStore[$i]['timetaking'] = $getStoreDetails->timetaking;
							$getNearestStore[$i]['totalDistance'] = $getStoreDetails->totalDistance;
							$getNearestStore[$i]['distance'] = $getStoreDetails->distance;
							$getNearestStore[$i]['is_saved'] = $getStoreDetails->is_saved;

							$i++;
						}
					} else {

						return response()->json([
							'status' => 0,
							'code' => 406,
							'message' => 'Something went wrong!',
							'data' => [
								'savedStoreList' => []
							]
						]);
					}
				}


				if (isset($getNearestStore)) {
					return response()->json([
						'status' => 1,
						'code' => 200,
						'message' => 'Data Fetched!',
						'data' => [
							'savedStoreList' => $getNearestStore
						]
					]);
				} else {

					return response()->json([
						'status' => 1,
						'code' => 402,
						'message' => 'No Data Available!',
						'data' => [
							'savedStoreList' => []
						]
					]);
				}
			} else {
				return response()->json([
					'status' => 0,
					'code' => 405,
					'message' => 'Something went wrong!',
					'data' => [
						'savedStoreList' => []
					]
				]);
			}
		} else {

			return response()->json([
				'status' => 0,
				'code' => 401,
				'message' => 'Mandatory values can not be blank!',
				'data' => [
					'savedStoreList' => []
				]
			]);
		}
	}

	function get_coordinates($city, $street, $province)
	{

		// $url = "https://maps.google.com/maps/api/geocode/json?address=$address&sensor=false&region=Poland&key=AIzaSyC3xxlVQ8tP2jQBN9SG7chLjAhXJsyiuiU";

		$address = urlencode($city . ',' . $street . ',' . $province);
		$url = "https://maps.google.com/maps/api/geocode/json?address=$address&sensor=false&key=AIzaSyC3xxlVQ8tP2jQBN9SG7chLjAhXJsyiuiU";
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_PROXYPORT, 3128);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
		$response = curl_exec($ch);
		curl_close($ch);
		$response_a = json_decode($response);
		if (isset($response_a->status)) {
			$status = $response_a->status;

			if ($status == 'ZERO_RESULTS') {
				return FALSE;
			} else {
				$return = array('lat' => $response_a->results[0]->geometry->location->lat, 'long' => $long = $response_a->results[0]->geometry->location->lng);
				return $return;
			}
		} else {
			return FALSE;
		}
	}


	function GetDrivingDistance($lat1, $lat2, $long1, $long2)
	{

		//units=metric if you want result in Kilometers. units = imperial if you want result in Miles.
		//  $url = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=".$lat1.",".$long1."&destinations=".$lat2.",".$long2."&mode=driving&language=pl-PL&key=AIzaSyC3xxlVQ8tP2jQBN9SG7chLjAhXJsyiuiU";

		$url = "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" . $lat1 . "," . $long1 . "&destinations=" . $lat2 . "," . $long2 . "&mode=driving&key=AIzaSyC3xxlVQ8tP2jQBN9SG7chLjAhXJsyiuiU";
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_PROXYPORT, 3128);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
		$response = curl_exec($ch);
		curl_close($ch);
		$response_a = json_decode($response, true);
		$status = $response_a['status'];
		if ($status == 'OK' || $status == 'ok') {
			//echo "<pre>"; print_r($data);
			if (array_key_exists('text', $response_a)) {
				$dist = $response_a['rows'][0]['elements'][0]['distance']['text'];
				$time = $response_a['rows'][0]['elements'][0]['duration']['text'];
			} else {
				$dist = 0;
				$time = 0;
			}
		} else {
			$dist = 0;
			$time = 0;
		}
		return array('distance' => $dist, 'time' => $time, 'pick_lat' => $lat1, 'pick_long' => $long1, 'drop_lat' => $lat2, 'drop_long' => $long2);
	}


	public function addShipcost($data)
	{
		############### fetch shipcost with order id#############
		$wh_shipment_ship_detail = DB::table('wh_shipper_order as o')
			->select(
				'shd.shipcost'
			)
			->join('wh_shipment_ship_detail AS shd', 'shd.order_id', '=', 'o.id')
			->where('shd.order_type', '=', 'ESHIP')
			->where('o.shipper_id', '=', $data['wh_account_id'])
			->Where('o.id', '=', $data['order_id'])
			->first();
		if ($wh_shipment_ship_detail) {
			$shipcost	= $wh_shipment_ship_detail->shipcost;
		} else {
			$shipcost = 0.00;
		}

		DB::table('wh_shipper_order')
			->where('id', $data['order_id'])

			->update(
				[

					'shipcost' => $shipcost
				]
			);

		############### fetch shipcost with order id#############
	}
	public function addSales($data = null, $type = null)
	{




		$u_account_head = DB::table('u_account_head as u')
			->select('*')
			// DB::raw("u.id as ac_head_id") 									 
			->where('u.name', '=', $data['u_account_head_name'])
			->first();

		// echo '<pre>';
		// print_r($u_account_head);
		if (@$u_account_head) {

			$u_sale_statement = DB::table('u_sale_statement as s')
				->select(
					'*'
				)
				->where('s.status', '=', "Running")
				->where('s.wh_account_id', '=', $data['wh_account_id'])
				->first();

			// echo '<pre>';
			// print_r($u_sale_statement);

			if (@$u_sale_statement) {

				######### get amnt from drop order table########
				$wh_shipper_order = DB::table('wh_shipper_order as o')
					->select('*')
					->where('o.shipper_id', '=', $data['wh_account_id'])
					->Where('o.id', '=', $data['order_id'])
					->first();

				######### get amnt from drop order table########

				// echo '<pre>';
				// print_r($wh_shipper_order); die;

				$amt = $wh_shipper_order->discounted_amount_after_coupon;
				// if($type==0){     // 0 type is for ecom orders without carrier
				// $wh_customer_id=$wh_shipper_order->ecom_seller_id;
				// }else if($type==-1){

				$wh_customer_id = $wh_shipper_order->ecom_seller_id;	//for ecom orders orders with carrier




				// }
				if ($u_account_head->rate_type == "Percent") {
					$cal_amt = $amt * $u_account_head->default_value / 100;
				} else {
					$cal_amt = $u_account_head->default_value;
				}
				$final_amt = $amt + $cal_amt;


				######### commission ################
				if ($u_account_head->commisson_type == "Percent") {
					$comm = $cal_amt * $u_account_head->commisson_value / 100;
				} else {
					$comm = $u_account_head->commisson_value;
				}
				if ($data['u_account_head_name'] == "Pick and Pack") {

					DB::table('wh_shipper_order')
						->where('id', $data['order_id'])

						->update(
							[
								'pickpack_calculated' => $cal_amt,
								'pickpack_comm' => $comm
							]
						);
				} else if ($data['u_account_head_name'] == "Shipping") {


					DB::table('wh_shipper_order')
						->where('id', $data['order_id'])

						->update(
							[
								'shipping_calculated' => $cal_amt,
								'shipping_comm' => $comm
							]
						);
				} else if ($data['u_account_head_name'] == "Delivery") {

					DB::table('wh_shipper_order')
						->where('id', $data['order_id'])

						->update(
							[
								'delivery_calculated' => $cal_amt,
								'delivery_comm' => $comm
							]
						);
				}

				######### commission ################

				$account_head_id = $u_account_head->id;
				$sale_statement_id = $u_sale_statement->id;
				$wh_account_id = $data['wh_account_id'];
				$seller_order_id = $data['order_id'];
				$total_value = $amt;


				$sale_txn_view_id = "";
				$sale_txn_details_id = "";

				$head_code = $u_account_head->code;
				$default_value = $u_account_head->default_value;




				$invoice_no = rand(0, time());
				$marketplace_id = 0;
				$seller_product_id = 0;
				$order_date = $wh_shipper_order->order_date;
				$order_amt = $amt;
				$order_tax_amount = 0;
				$order_tax_amount_rate = 0;
				$order_shipping_amount = 0;
				$order_shipping_amount_rate = 0;
				$invoice_transfer_amount = 0;
				$invoice_net_amount = 0;


				$sale_txn_view_id = DB::table('u_sale_txn_view')->insertGetId(
					['wh_account_id' => $wh_account_id, 'seller_id' => $wh_customer_id, 'sale_statement_id' => $sale_statement_id, 'seller_order_id' => $seller_order_id, 'invoice_no' => $invoice_no, 'marketplace_id' => $marketplace_id, 'seller_product_id' => $seller_product_id, 'order_date' => $order_date, 'order_amt' => $order_amt, 'order_tax_amount' => $order_tax_amount,  'order_tax_amount_rate' => $order_tax_amount_rate,  'order_shipping_amount' => $order_shipping_amount,  'order_shipping_amount_rate' => $order_shipping_amount_rate,  'invoice_transfer_amount' => $invoice_transfer_amount,  'invoice_net_amount' => $invoice_net_amount, 'calculated_amt' => $cal_amt]
				);

				// die;
				$sale_txn_viewdetails_id = DB::table('u_sale_txn_details')->insertGetId(
					['sale_txn_view_id' => $sale_txn_view_id, 'saller_id' => $wh_customer_id, 'wh_account_id' => $wh_account_id, 'account_head_id' => $account_head_id, 'head_code' => $head_code, 'default_value' => $default_value, 'total_value' => $total_value, 'calculated_amt' => $cal_amt]
				);
			}
		}
		return true;
	}

	public function sendMail($to_array, $from_arr, $subject, $message, $name)
	{
		$url = 'https://api.elasticemail.com/v2/email/send';

		/* $mail_message1='<html>
            <body>
                <h3>Hello <b> '.ucwords($name).'</b></h3>
                <p>Thank you for ordering from Anything instantly!</p>
				<p> '.$message.'  </p>
				<p>We value your opinion to improve continuously. If you have any suggestions/queries, write us at support@anythinginstantly.com </p>
				<p></p>
                <div>Anything Instanlty</div>
            </body>
        </html>'; */



		$mail_message = '<html>
            <body>
                 ' . $message . '   
            </body>
        </html>';

		try {
			$post = array(
				'from' => $from_arr['email'],
				'fromName' => $from_arr['name'],
				'to' => $to_array[0],
				'apikey' => '20310f96-2833-4932-86f6-e838a4508537',
				'subject' => html_entity_decode($subject),
				'bodyHtml' => html_entity_decode($mail_message),
				'bodyText' => '',
				'isTransactional' => false,
			);
			$ch = curl_init();
			curl_setopt_array($ch, array(
				CURLOPT_URL => $url,
				CURLOPT_POST => true,
				CURLOPT_POSTFIELDS => $post,
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_HEADER => false,
				CURLOPT_SSL_VERIFYPEER => false
			));

			$result = curl_exec($ch);
			curl_close($ch);
			return true;
		} catch (Exception $ex) {
			Log::info(' Something went wrong');
			return false;
		}
	}

	public function sendSMS($mobile, $message)
	{

 
	}
}
